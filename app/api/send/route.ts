import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderTemplate } from "@/lib/render-template";

const resend = new Resend(process.env.RESEND_API_KEY);

// Admin client for data fetching (bypassing RLS for campaign data)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { campaignId, type, email, fromName, fromEmail } = body;

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
        const subscriberVars = ["first_name", "last_name", "email", "unsubscribe_url"];
        const globalAssets = Object.fromEntries(
            Object.entries(campaign.variable_values || {}).filter(([key]) => !subscriberVars.includes(key))
        ) as Record<string, string>;
        const globalHtmlContent = renderTemplate(campaign.html_content || "", globalAssets);
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
                    return `href=${quote}${url}${sep}sid=${simulationSubscriber.id}&em=${encodeURIComponent(simulationSubscriber.email)}${quote}`;
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
                from: "DreamPlay <hello@email.dreamplaypianos.com>",
                to: email,
                subject: `[TEST] ${campaign.subject_line}`,
                html: finalHtml,
            });

            if (error) {
                console.error("❌ RESEND FAILED:", JSON.stringify(error, null, 2));
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, data });
        }

        else if (type === "broadcast") {
            console.log(`🚀 Starting broadcast for campaign ${campaignId}`);

            // Fetch recipients
            const lockedSubscriberId = campaign.variable_values?.subscriber_id;
            let query = supabaseAdmin.from("subscribers").select("*").eq("status", "active");
            if (lockedSubscriberId) {
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

            let successCount = 0;
            let failureCount = 0;
            let firstResendEmailId: string | null = null;
            const sentRecords: any[] = [];

            // Send to each recipient
            await Promise.all(recipients.map(async (sub) => {
                try {
                    const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${sub.id}&c=${campaignId}`;

                    // Personalize content
                    let personalHtml = htmlWithFooter
                        .replace(/{{first_name}}/g, sub.first_name || "Musical Family")
                        .replace(/{{last_name}}/g, sub.last_name || "")
                        .replace(/{{email}}/g, sub.email)
                        .replace(/{{unsubscribe_url}}/g, unsubscribeUrl)
                        .replace(/{{subscriber_id}}/g, sub.id);

                    // Auto-append sid and em to all links
                    personalHtml = personalHtml.replace(/href=(["'])(https?:\/\/[^"']+)\1/g, (match, quote, url) => {
                        if (url.includes('/unsubscribe')) return match;
                        const sep = url.includes('?') ? '&' : '?';
                        return `href=${quote}${url}${sep}sid=${sub.id}&em=${encodeURIComponent(sub.email)}${quote}`;
                    });

                    // Send Email
                    const { data: sendData, error } = await resend.emails.send({
                        from: process.env.RESEND_FROM_EMAIL || "DreamPlay <hello@email.dreamplaypianos.com>",
                        to: sub.email,
                        subject: campaign.subject_line,
                        html: personalHtml,
                        headers: {
                            "List-Unsubscribe": `<${unsubscribeUrl}>`,
                            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
                        }
                    });

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
                            campaign_id: campaignId,
                            subscriber_id: sub.id,
                            sent_at: new Date().toISOString(),
                            variant_sent: campaign.subject_line || null
                        });
                    }
                } catch (e) {
                    console.error(`Unexpected error for ${sub.email}:`, e);
                    failureCount++;
                }
            }));

            // Insert history
            if (sentRecords.length > 0) {
                const { error: historyError } = await supabaseAdmin.from("sent_history").insert(sentRecords);
                if (historyError) console.error("Failed to insert history:", historyError);
            }

            // Update campaign status
            const updateData: any = {
                status: "completed",
                total_recipients: recipients.length
            };
            if (firstResendEmailId) {
                updateData.resend_email_id = firstResendEmailId;
            }
            await supabaseAdmin.from("campaigns").update(updateData).eq("id", campaignId);

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