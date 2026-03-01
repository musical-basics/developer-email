import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderTemplate } from "@/lib/render-template";
import { addPlayButtonsToVideoThumbnails } from "@/lib/video-overlay";
import { createShopifyDiscount } from "@/app/actions/shopify-discount";

const resend = new Resend(process.env.RESEND_API_KEY);

// Admin client for data fetching (bypassing RLS for campaign data)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { campaignId, type, email, fromName, fromEmail, clickTracking = true, openTracking = true, resendClickTracking = false, resendOpenTracking = false } = body;

        // Fetch Campaign
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .select("*")
            .eq("id", campaignId)
            .single();

        if (campaignError || !campaign) {
            console.error("Supabase Error:", campaignError);
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // Render Global Template (exclude per-subscriber variables so they survive to per-recipient pass)
        const subscriberVars = ["first_name", "last_name", "email", "unsubscribe_url", "unsubscribe_link_url", "unsubscribe_link"];
        const globalAssets = Object.fromEntries(
            Object.entries(campaign.variable_values || {}).filter(([key]) => !subscriberVars.includes(key))
        ) as Record<string, string>;
        const globalHtmlContent = renderTemplate(campaign.html_content || "", globalAssets);
        // Snapshot email-asset images for broadcast sends (test sends skip this)
        let htmlContent = globalHtmlContent;

        if (type === "test") {
            if (!email) return NextResponse.json({ error: "Test email required" }, { status: 400 });

            // Simulation Subscriber Logic
            let simulationSubscriber = null;
            const lockedSubscriberId = campaign.variable_values?.subscriber_id;

            if (lockedSubscriberId) {
                const { data } = await supabaseAdmin
                    .from("subscribers")
                    .select("*")
                    .eq("id", lockedSubscriberId)
                    .single();
                simulationSubscriber = data;
            } else {
                const { data } = await supabaseAdmin
                    .from("subscribers")
                    .select("*")
                    .eq("status", "active")
                    .limit(1)
                    .single();
                simulationSubscriber = data;
            }

            // Replace Variables
            let finalHtml = htmlContent;
            if (simulationSubscriber) {
                finalHtml = finalHtml
                    .replace(/{{first_name}}/g, simulationSubscriber.first_name || "Musical Family")
                    .replace(/{{last_name}}/g, simulationSubscriber.last_name || "")
                    .replace(/{{email}}/g, simulationSubscriber.email)
                    .replace(/{{subscriber_id}}/g, simulationSubscriber.id);

                // Auto-append sid and em to all links
                finalHtml = finalHtml.replace(/href=(["'])(https?:\/\/[^"']+)\1/g, (match, quote, url) => {
                    if (url.includes('/unsubscribe')) return match;
                    const sep = url.includes('?') ? '&' : '?';
                    return `href=${quote}${url}${sep}sid=${simulationSubscriber.id}${quote}`;
                });
            } else {
                finalHtml = finalHtml
                    .replace(/{{first_name}}/g, "[Test Name]")
                    .replace(/{{email}}/g, "test@example.com")
                    .replace(/{{subscriber_id}}/g, "test-subscriber-id");
            }

            // Test Footer
            const unsubscribeFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
  <p style="margin: 0;">
    No longer want to receive these emails? 
    <a href="#" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.
  </p>
</div>
`;
            finalHtml += unsubscribeFooter;

            console.log("🚀 Sending Test Email...");
            const { data, error } = await resend.emails.send({
                from: fromName && fromEmail ? `${fromName} <${fromEmail}>` : (process.env.RESEND_FROM_EMAIL || "DreamPlay <hello@email.dreamplaypianos.com>"),
                to: email,
                subject: `[TEST] ${campaign.subject_line}`,
                html: finalHtml,
                click_tracking: resendClickTracking,
                open_tracking: resendOpenTracking,
            } as any);

            if (error) {
                console.error("❌ RESEND FAILED:", JSON.stringify(error, null, 2));
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, data });
        }

        else if (type === "broadcast") {
            console.log(`🚀 Starting broadcast for campaign ${campaignId}`);
            console.log(`📊 Tracking flags — click: ${clickTracking}, open: ${openTracking}, resendClick: ${resendClickTracking}, resendOpen: ${resendOpenTracking}, fromEmail: ${fromEmail}`);

            // If broadcasting from a template, create a child campaign for tracking
            let trackingCampaignId = campaignId;
            if (campaign.is_template) {
                const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const childName = `${campaign.name} — ${today}`;

                const { data: child, error: childError } = await supabaseAdmin
                    .from("campaigns")
                    .insert({
                        name: childName,
                        subject_line: campaign.subject_line,
                        html_content: campaign.html_content,
                        status: "draft",
                        is_template: false,
                        parent_template_id: campaignId,
                        // Strip subscriber_id so child shows in Completed tab (not filtered as subscriber-locked)
                        variable_values: (() => {
                            const { subscriber_id, ...rest } = campaign.variable_values || {};
                            return rest;
                        })(),
                    })
                    .select("id")
                    .single();

                if (childError || !child) {
                    console.error("Failed to create child campaign:", childError);
                    return NextResponse.json({ error: "Failed to create send record" }, { status: 500 });
                }

                trackingCampaignId = child.id;
                console.log(`📋 Created child campaign ${trackingCampaignId} from template ${campaignId}`);
            }

            // Fetch recipients
            const lockedSubscriberId = campaign.variable_values?.subscriber_id;
            const lockedSubscriberIds: string[] | undefined = campaign.variable_values?.subscriber_ids;
            let query = supabaseAdmin.from("subscribers").select("*").eq("status", "active");
            if (lockedSubscriberIds && lockedSubscriberIds.length > 0) {
                query = query.in("id", lockedSubscriberIds);
            } else if (lockedSubscriberId) {
                query = query.eq("id", lockedSubscriberId);
            }

            const { data: recipients, error: recipientError } = await query;

            if (recipientError || !recipients || recipients.length === 0) {
                return NextResponse.json({ error: "No active subscribers found" }, { status: 400 });
            }

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com";

            // Unsubscribe Footer Template
            const unsubscribeFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
  <p style="margin: 0;">
    No longer want to receive these emails? 
    <a href="{{unsubscribe_url}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.
  </p>
</div>
`;
            const htmlWithFooter = htmlContent + unsubscribeFooter;

            // Composite play button overlay on video-linked thumbnails (once for all recipients)
            const htmlWithVideoOverlay = await addPlayButtonsToVideoThumbnails(htmlWithFooter);

            let successCount = 0;
            let failureCount = 0;
            let firstResendEmailId: string | null = null;
            const sentRecords: any[] = [];

            // Send to each recipient
            // Pre-check for per-user discount config
            const discountPresetConfig = campaign.variable_values?.discount_preset_config;
            const isPerUserDiscount = !!campaign.variable_values?.discount_preset_id && !!discountPresetConfig;

            for (let ri = 0; ri < recipients.length; ri++) {
                const sub = recipients[ri];
                try {
                    const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${sub.id}&c=${trackingCampaignId}`;

                    // Personalize content
                    let personalHtml = htmlWithVideoOverlay
                        .replace(/{{first_name}}/g, sub.first_name || "Musical Family")
                        .replace(/{{last_name}}/g, sub.last_name || "")
                        .replace(/{{email}}/g, sub.email)
                        .replace(/{{unsubscribe_url}}/g, unsubscribeUrl)
                        .replace(/{{unsubscribe_link_url}}/g, unsubscribeUrl)
                        .replace(/{{unsubscribe_link}}/g, unsubscribeUrl)
                        .replace(/{{subscriber_id}}/g, sub.id);

                    // Per-user discount: generate a unique Shopify code for this recipient
                    if (isPerUserDiscount) {
                        try {
                            const discountRes = await createShopifyDiscount({
                                type: discountPresetConfig.type,
                                value: discountPresetConfig.value,
                                durationDays: discountPresetConfig.durationDays,
                                codePrefix: discountPresetConfig.codePrefix,
                                usageLimit: 1,
                            });
                            if (discountRes.success && discountRes.code) {
                                // Replace discount code text in HTML
                                const oldCode = campaign.variable_values?.discount_code;
                                if (oldCode) {
                                    personalHtml = personalHtml.replaceAll(oldCode, discountRes.code);
                                }
                                // Also replace discount= param in any URLs
                                personalHtml = personalHtml.replace(/discount=[A-Z0-9-]+/g, `discount=${discountRes.code}`);
                            }
                            // Rate limit: small delay between Shopify API calls
                            if (ri < recipients.length - 1) {
                                await new Promise(r => setTimeout(r, 300));
                            }
                        } catch (discountErr) {
                            console.error(`Failed to generate per-user discount for ${sub.email}:`, discountErr);
                            // Continue with the preview code as fallback
                        }
                    }

                    // Click tracking: rewrite all links to go through our redirect tracker
                    if (clickTracking) {
                        personalHtml = personalHtml.replace(/href=([\"'])(https?:\/\/[^\"']+)\1/g, (match, quote, url) => {
                            if (url.includes('/unsubscribe')) return match;
                            if (url.includes('/api/track/')) return match; // already tracked
                            const trackUrl = `${baseUrl}/api/track/click?u=${encodeURIComponent(url)}&c=${trackingCampaignId}&s=${sub.id}`;
                            return `href=${quote}${trackUrl}${quote}`;
                        });
                    } else {
                        // Fallback: just append sid+em inline (no redirect)
                        personalHtml = personalHtml.replace(/href=([\"'])(https?:\/\/[^\"']+)\1/g, (match, quote, url) => {
                            if (url.includes('/unsubscribe')) return match;
                            const sep = url.includes('?') ? '&' : '?';
                            return `href=${quote}${url}${sep}sid=${sub.id}&cid=${trackingCampaignId}${quote}`;
                        });
                    }

                    // Open tracking pixel (loaded from our own domain)
                    if (openTracking) {
                        const openPixel = `<img src="${baseUrl}/api/track/open?c=${trackingCampaignId}&s=${sub.id}" width="1" height="1" alt="" style="display:none !important;width:1px;height:1px;opacity:0;" />`;
                        personalHtml = personalHtml.replace(/<\/body>/i, `${openPixel}</body>`);
                        if (!personalHtml.includes(openPixel)) {
                            personalHtml += openPixel;
                        }
                    }

                    // Send Email (disable Resend's tracking — we use our own open pixel + click redirect)
                    const { data: sendData, error } = await resend.emails.send({
                        from: fromName && fromEmail ? `${fromName} <${fromEmail}>` : (process.env.RESEND_FROM_EMAIL || "DreamPlay <hello@email.dreamplaypianos.com>"),
                        to: sub.email,
                        subject: campaign.subject_line,
                        html: personalHtml,
                        headers: {
                            "List-Unsubscribe": `<${unsubscribeUrl}>`,
                            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
                        },
                        click_tracking: resendClickTracking,
                        open_tracking: resendOpenTracking,
                    } as any);

                    if (error) {
                        console.error(`Failed to send to ${sub.email}:`, error);
                        failureCount++;
                    } else {
                        successCount++;
                        // Capture the first Resend email ID for the "Show Email" link
                        if (!firstResendEmailId && sendData?.id) {
                            firstResendEmailId = sendData.id;
                        }
                        sentRecords.push({
                            campaign_id: trackingCampaignId,
                            subscriber_id: sub.id,
                            sent_at: new Date().toISOString(),
                            variant_sent: campaign.subject_line || null
                        });
                    }
                } catch (e) {
                    console.error(`Unexpected error for ${sub.email}:`, e);
                    failureCount++;
                }

                // Rate-limit buffer: Resend allows 2 req/sec, so 600ms gap is safe
                if (ri < recipients.length - 1) {
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            // Insert history
            if (sentRecords.length > 0) {
                const { error: historyError } = await supabaseAdmin.from("sent_history").insert(sentRecords);
                if (historyError) console.error("Failed to insert history:", historyError);
            }

            // Update the tracking campaign (child or original) to completed
            const updateData: any = {
                status: "completed",
                total_recipients: recipients.length,
                sent_from_email: fromEmail || null,
            };
            if (firstResendEmailId) {
                updateData.resend_email_id = firstResendEmailId;
            }
            await supabaseAdmin.from("campaigns").update(updateData).eq("id", trackingCampaignId);

            const message = `Broadcast complete: ${successCount} sent, ${failureCount} failed out of ${recipients.length} recipients.`;
            console.log(`✅ ${message}`);

            return NextResponse.json({
                success: true,
                message,
                stats: { sent: successCount, failed: failureCount, total: recipients.length }
            });
        }

        return NextResponse.json({ error: "Invalid Type" }, { status: 400 });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}