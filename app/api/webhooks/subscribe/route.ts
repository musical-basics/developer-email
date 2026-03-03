import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderTemplate } from "@/lib/render-template";
import { createShopifyDiscount } from "@/app/actions/shopify-discount";
import { applyAllMergeTags } from "@/lib/merge-tags";


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

// ─── DB Logger ────────────────────────────────────────────────────────
async function logTriggerEvent(
    level: "info" | "warn" | "error" | "success",
    event: string,
    details: Record<string, any> = {}
) {
    try {
        await supabase.from("trigger_logs").insert({
            level,
            event,
            details,
        });
    } catch (e) {
        console.error("[TriggerLog] Failed to write log:", e);
    }
    // Also console.log for server-side visibility
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "success" ? "✅" : "ℹ️";
    console.log(`${prefix} [Trigger] ${event}`, Object.keys(details).length > 0 ? JSON.stringify(details) : "");
}

// ─── Trigger execution (fire-and-forget) ──────────────────────────────
async function executeTriggers(subscriberTags: string[], subscriberId: string, subscriberEmail: string) {
    await logTriggerEvent("info", "Trigger execution started", {
        subscriber_email: subscriberEmail,
        subscriber_id: subscriberId,
        new_tags: subscriberTags,
    });

    try {
        // Find active triggers matching any of the subscriber's tags
        const { data: triggers, error: tErr } = await supabase
            .from("email_triggers")
            .select("*")
            .eq("trigger_type", "subscriber_tag")
            .eq("is_active", true)
            .in("trigger_value", subscriberTags);

        if (tErr) {
            await logTriggerEvent("error", "Failed to query email_triggers table", {
                error: tErr.message,
                hint: tErr.hint || "Does the email_triggers table exist? Run the SQL migration.",
                subscriber_email: subscriberEmail,
            });
            return;
        }

        if (!triggers || triggers.length === 0) {
            await logTriggerEvent("warn", "No matching triggers found", {
                subscriber_email: subscriberEmail,
                searched_tags: subscriberTags,
                hint: "Create triggers on the Triggers page that match these tag names.",
            });
            return;
        }

        await logTriggerEvent("info", `Found ${triggers.length} matching trigger(s)`, {
            subscriber_email: subscriberEmail,
            triggers: triggers.map(t => ({ id: t.id, name: t.name, trigger_value: t.trigger_value })),
        });

        for (const trigger of triggers) {
            try {
                if (!trigger.campaign_id) {
                    await logTriggerEvent("warn", `Trigger "${trigger.name}" has no linked campaign`, {
                        trigger_id: trigger.id,
                        subscriber_email: subscriberEmail,
                        hint: "Link an automated email to this trigger on the Triggers page.",
                    });
                    continue;
                }

                // Fetch the linked automated email template
                const { data: campaign, error: campErr } = await supabase
                    .from("campaigns")
                    .select("id, name, subject_line, html_content, variable_values")
                    .eq("id", trigger.campaign_id)
                    .single();

                if (campErr || !campaign) {
                    await logTriggerEvent("error", `Failed to fetch linked campaign`, {
                        trigger_name: trigger.name,
                        campaign_id: trigger.campaign_id,
                        error: campErr?.message || "Campaign not found",
                        subscriber_email: subscriberEmail,
                    });
                    continue;
                }

                if (!campaign.html_content) {
                    await logTriggerEvent("warn", `Campaign "${campaign.name}" has no HTML content`, {
                        trigger_name: trigger.name,
                        campaign_id: campaign.id,
                        subscriber_email: subscriberEmail,
                        hint: "Design the email template in the Email Builder first.",
                    });
                    continue;
                }

                // Generate Shopify discount code if configured
                let discountCode = "";
                if (trigger.generate_discount && trigger.discount_config) {
                    const cfg = trigger.discount_config;
                    await logTriggerEvent("info", `Generating Shopify discount code`, {
                        trigger_name: trigger.name,
                        config: cfg,
                        subscriber_email: subscriberEmail,
                    });

                    const result = await createShopifyDiscount({
                        type: cfg.type,
                        value: cfg.value,
                        durationDays: cfg.durationDays,
                        codePrefix: cfg.codePrefix,
                        usageLimit: cfg.usageLimit ?? 1,
                    });

                    if (result.success && result.code) {
                        discountCode = result.code;
                        await logTriggerEvent("success", `Shopify code generated: ${discountCode}`, {
                            trigger_name: trigger.name,
                            subscriber_email: subscriberEmail,
                        });
                    } else {
                        await logTriggerEvent("error", `Shopify discount generation failed`, {
                            trigger_name: trigger.name,
                            error: result.error,
                            subscriber_email: subscriberEmail,
                        });
                    }
                }

                // Build template variables
                const assets: Record<string, string> = {
                    ...(campaign.variable_values || {}),
                    subscriber_email: subscriberEmail,
                    discount_code: discountCode,
                };

                // Inject discount code into URL if configured
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

                // Render template (campaign variables + smart blocks)
                let renderedHtml = renderTemplate(campaign.html_content, assets, subscriberTags);

                // Apply merge tags (subscriber fields, global links, dynamic vars)
                const { data: subscriberData } = await supabase
                    .from("subscribers")
                    .select("*")
                    .eq("id", subscriberId)
                    .single();

                if (subscriberData) {
                    renderedHtml = await applyAllMergeTags(renderedHtml, subscriberData, {
                        discount_code: discountCode,
                    });
                }

                // Determine sender
                const fromName = campaign.variable_values?.from_name || "Lionel Yu";
                const senderEmail = campaign.variable_values?.from_email || "lionel@email.dreamplaypianos.com";
                const subjectLine = campaign.subject_line || trigger.name;

                await logTriggerEvent("info", `Sending email via Resend`, {
                    trigger_name: trigger.name,
                    campaign_name: campaign.name,
                    to: subscriberEmail,
                    from: `${fromName} <${senderEmail}>`,
                    subject: subjectLine,
                });

                // Send via Resend
                const { data: emailResult, error: emailError } = await resend.emails.send({
                    from: `${fromName} <${senderEmail}>`,
                    to: [subscriberEmail],
                    subject: subjectLine,
                    html: renderedHtml,
                });

                if (emailError) {
                    await logTriggerEvent("error", `Resend email send failed`, {
                        trigger_name: trigger.name,
                        subscriber_email: subscriberEmail,
                        error: emailError,
                    });
                    continue;
                }

                await logTriggerEvent("success", `Email sent successfully`, {
                    trigger_name: trigger.name,
                    subscriber_email: subscriberEmail,
                    resend_id: emailResult?.id,
                    campaign_name: campaign.name,
                });

                // Log to sent_history
                await supabase.from("sent_history").insert({
                    campaign_id: campaign.id,
                    subscriber_id: subscriberId,
                    resend_email_id: emailResult?.id || null,
                });

                // Update campaign status
                await supabase.from("campaigns").update({ status: "active" }).eq("id", campaign.id);

            } catch (innerErr: any) {
                await logTriggerEvent("error", `Trigger execution error`, {
                    trigger_name: trigger.name,
                    subscriber_email: subscriberEmail,
                    error: innerErr.message || String(innerErr),
                    stack: innerErr.stack?.split("\n").slice(0, 3),
                });
            }
        }
    } catch (err: any) {
        await logTriggerEvent("error", "Fatal error in executeTriggers", {
            subscriber_email: subscriberEmail,
            error: err.message || String(err),
            stack: err.stack?.split("\n").slice(0, 3),
        });
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

        await logTriggerEvent("info", "Subscribe webhook received", {
            email,
            tags: finalTags,
            city,
            country,
        });

        // 🏷️ Auto-create tag_definitions for any new tags
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
                    color: "#6b7280",
                }));
                await supabase.from("tag_definitions").insert(newDefs);
                await logTriggerEvent("info", `Auto-created tag definitions: ${missingTags.join(", ")}`, { tags: missingTags });
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
                location_city: city,
                location_country: country,
                ip_address: ip_address
            }, { onConflict: "email" })
            .select()
            .single();

        if (error) throw error;

        // 📍 IDENTITY STITCHING
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

        // 🔥 TRIGGER EXECUTION
        const newTags = existingUser?.tags
            ? finalTags.filter((t: string) => !existingUser.tags.includes(t))
            : finalTags;

        if (newTags.length > 0) {
            await logTriggerEvent("info", "New tags detected, executing triggers", {
                email,
                new_tags: newTags,
                existing_tags: existingUser?.tags || [],
            });
            await executeTriggers(newTags, data.id, email);
        } else {
            await logTriggerEvent("warn", "No new tags — skipping trigger execution", {
                email,
                incoming_tags: finalTags,
                existing_tags: existingUser?.tags || [],
                hint: "All incoming tags already existed on this subscriber. Triggers only fire on NEW tags.",
            });
        }

        return NextResponse.json(
            { success: true, id: data.id },
            { headers: getCorsHeaders(request) }
        );

    } catch (error: any) {
        await logTriggerEvent("error", "Webhook error", { error: error.message });
        console.error("Webhook Error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: getCorsHeaders(request) }
        );
    }
}
