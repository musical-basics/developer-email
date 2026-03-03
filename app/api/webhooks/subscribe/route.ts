import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderTemplate } from "@/lib/render-template";
import { createShopifyDiscount } from "@/app/actions/shopify-discount";


const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// 1. Define your Safe List
const allowedOrigins = [
    "https://dreamplaypianos.com",
    "https://www.dreamplaypianos.com"
];

// 2. Helper to generate dynamic headers based on who is asking
function getCorsHeaders(request: Request) {
    const origin = request.headers.get("origin");

    // If the requester is in our safe list, let them in. 
    // Otherwise, default to the main domain (which effectively blocks them).
    const allowOrigin = (origin && allowedOrigins.includes(origin))
        ? origin
        : allowedOrigins[0];

    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

export async function OPTIONS(request: Request) {
    return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

// ─── Trigger execution (fire-and-forget) ──────────────────────────────
async function executeTriggers(subscriberTags: string[], subscriberId: string, subscriberEmail: string) {
    try {
        // Find active triggers matching any of the subscriber's tags
        const { data: triggers, error: tErr } = await supabase
            .from("email_triggers")
            .select("*")
            .eq("trigger_type", "subscriber_tag")
            .eq("is_active", true)
            .in("trigger_value", subscriberTags);

        if (tErr || !triggers || triggers.length === 0) return;

        for (const trigger of triggers) {
            try {
                if (!trigger.campaign_id) {
                    console.log(`[Trigger] "${trigger.name}" has no linked campaign, skipping.`);
                    continue;
                }

                // Fetch the linked automated email template
                const { data: campaign } = await supabase
                    .from("campaigns")
                    .select("id, name, subject_line, html_content, variable_values")
                    .eq("id", trigger.campaign_id)
                    .single();

                if (!campaign || !campaign.html_content) {
                    console.log(`[Trigger] "${trigger.name}" linked campaign has no HTML content, skipping.`);
                    continue;
                }

                // Generate Shopify discount code if configured
                let discountCode = "";
                if (trigger.generate_discount && trigger.discount_config) {
                    const cfg = trigger.discount_config;
                    const result = await createShopifyDiscount({
                        type: cfg.type,
                        value: cfg.value,
                        durationDays: cfg.durationDays,
                        codePrefix: cfg.codePrefix,
                        usageLimit: cfg.usageLimit ?? 1,
                    });
                    if (result.success && result.code) {
                        discountCode = result.code;
                        console.log(`[Trigger] Generated Shopify code: ${discountCode} for ${subscriberEmail}`);
                    } else {
                        console.error(`[Trigger] Shopify discount generation failed:`, result.error);
                    }
                }

                // Build template variables: merge campaign assets + trigger-specific vars
                const assets: Record<string, string> = {
                    ...(campaign.variable_values || {}),
                    subscriber_email: subscriberEmail,
                    discount_code: discountCode,
                };

                // If there's a discount code and a target URL key, inject into URL
                if (discountCode && campaign.variable_values?.discount_preset_config?.targetUrlKey) {
                    const urlKey = campaign.variable_values.discount_preset_config.targetUrlKey;
                    const baseUrl = assets[urlKey] || "";
                    if (baseUrl) {
                        const sep = baseUrl.includes("?") ? "&" : "?";
                        assets[urlKey] = baseUrl.includes("discount=")
                            ? baseUrl.replace(/discount=[^&]+/, `discount=${discountCode}`)
                            : `${baseUrl}${sep}discount=${discountCode}`;
                    }
                }

                // Render template
                const renderedHtml = renderTemplate(campaign.html_content, assets, subscriberTags);

                // Determine sender
                const fromName = campaign.variable_values?.from_name || "Lionel Yu";
                const fromEmail = campaign.variable_values?.from_email || "lionel@email.dreamplaypianos.com";
                const subjectLine = campaign.subject_line || trigger.name;

                // Send via Resend
                const { data: emailResult, error: emailError } = await resend.emails.send({
                    from: `${fromName} <${fromEmail}>`,
                    to: [subscriberEmail],
                    subject: subjectLine,
                    html: renderedHtml,
                });

                if (emailError) {
                    console.error(`[Trigger] Failed to send "${trigger.name}" to ${subscriberEmail}:`, emailError);
                    continue;
                }

                console.log(`[Trigger] Sent "${trigger.name}" to ${subscriberEmail} (Resend ID: ${emailResult?.id})`);

                // Log to sent_history
                await supabase.from("sent_history").insert({
                    campaign_id: campaign.id,
                    subscriber_id: subscriberId,
                    resend_email_id: emailResult?.id || null,
                });

                // Update campaign status to reflect it's been sent at least once
                await supabase.from("campaigns").update({ status: "active" }).eq("id", campaign.id);

            } catch (innerErr) {
                console.error(`[Trigger] Error executing trigger "${trigger.name}":`, innerErr);
            }
        }
    } catch (err) {
        console.error("[Trigger] Fatal error in executeTriggers:", err);
    }
}

export async function POST(request: Request) {
    try {
        const { email, first_name, last_name, tags, city, country, ip_address, temp_session_id } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email required" },
                { status: 400, headers: getCorsHeaders(request) }
            );
        }

        const finalTags = tags && Array.isArray(tags) ? tags : ["Website Import"];

        // 🏷️ Auto-create tag_definitions for any new tags
        // This ensures tags sent from external sources (website popups etc.) appear in the tags manager
        if (finalTags.length > 0) {
            const { data: existingDefs } = await supabase
                .from("tag_definitions")
                .select("name")
                .in("name", finalTags);

            const existingNames = new Set((existingDefs || []).map((d: any) => d.name));
            const missingTags = finalTags.filter((t: string) => !existingNames.has(t));

            if (missingTags.length > 0) {
                const newDefs = missingTags.map((name: string) => ({
                    name,
                    color: "#6b7280", // default gray
                }));
                await supabase.from("tag_definitions").insert(newDefs);
                console.log(`[Webhook] Auto-created tag definitions: ${missingTags.join(", ")}`);
            }
        }

        // Check for existing user to merge tags
        const { data: existingUser } = await supabase
            .from("subscribers")
            .select("tags")
            .eq("email", email)
            .single();

        let mergedTags = finalTags;
        if (existingUser?.tags) {
            mergedTags = Array.from(new Set([...existingUser.tags, ...finalTags]));
        }

        const { data, error } = await supabase
            .from("subscribers")
            .upsert({
                email,
                first_name: first_name || "",
                last_name: last_name || "",
                tags: mergedTags,
                status: "active",
                // 📍 NEW: Location Data
                location_city: city,
                location_country: country,
                ip_address: ip_address
            }, { onConflict: "email" })
            .select()
            .single();

        if (error) throw error;

        // 📍 IDENTITY STITCHING: Link anonymous browsing history to new subscriber
        if (temp_session_id && data.id) {
            const { error: stitchError, count } = await supabase
                .from("subscriber_events")
                .update({ subscriber_id: data.id })
                .is("subscriber_id", null)
                .eq("metadata->>temp_session_id", temp_session_id);

            if (stitchError) {
                console.error("[Webhook] Identity stitch error:", stitchError);
            } else {
                console.log(`[Webhook] Stitched ${count || 0} anonymous events for ${data.email}`);
            }
        }

        // 🔥 TRIGGER EXECUTION: Fire-and-forget — check for matching triggers  
        // Use only the NEW tags (not pre-existing ones) to avoid re-triggering
        const newTags = existingUser?.tags
            ? finalTags.filter((t: string) => !existingUser.tags.includes(t))
            : finalTags;

        if (newTags.length > 0) {
            executeTriggers(newTags, data.id, email).catch(err =>
                console.error("[Webhook] Trigger execution error:", err)
            );
        }

        return NextResponse.json(
            { success: true, id: data.id },
            { headers: getCorsHeaders(request) }
        );

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: getCorsHeaders(request) }
        );
    }
}
