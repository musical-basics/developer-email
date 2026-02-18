import { inngest } from "@/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderTemplate } from "@/lib/render-template";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export const sendCampaign = inngest.createFunction(
    { id: "send-campaign" },
    { event: "campaign.send" },
    async ({ event, step }) => {
        const { campaignId } = event.data;

        // 1. Fetch Campaign
        const campaign = await step.run("fetch-campaign", async () => {
            const { data, error } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", campaignId)
                .single();

            if (error || !data) throw new Error("Campaign not found");
            return data;
        });

        // 2. Fetch Recipients
        const recipients = await step.run("fetch-recipients", async () => {
            const lockedSubscriberId = campaign.variable_values?.subscriber_id;
            let query = supabase.from("subscribers").select("*").eq("status", "active");

            if (lockedSubscriberId) {
                query = query.eq("id", lockedSubscriberId);
            }
            // Exclude unsubscribed (redundant check but safe)
            query = query.neq('status', 'unsubscribed');

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        });

        if (recipients.length === 0) {
            return { message: "No recipients found" };
        }

        // 3. Send Emails in Batches
        const result = await step.run("send-emails", async () => {
            const globalHtmlContent = renderTemplate(campaign.html_content || "", campaign.variable_values || {});

            // Footer Template
            const unsubscribeFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
  <p style="margin: 0;">
    No longer want to receive these emails? 
    <a href="{{unsubscribe_url}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.
  </p>
</div>
`;
            const htmlWithFooter = globalHtmlContent + unsubscribeFooter;
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com";

            let successCount = 0;
            let failureCount = 0;
            const sentRecords: any[] = [];

            // Chunk processing to avoid rate limits
            const CHUNK_SIZE = 50;
            for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
                const chunk = recipients.slice(i, i + CHUNK_SIZE);

                await Promise.all(chunk.map(async (sub) => {
                    try {
                        // Generate Unsubscribe Link
                        const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${sub.id}&c=${campaignId}`;

                        // Personalize content
                        let personalHtml = htmlWithFooter
                            .replace(/{{first_name}}/g, sub.first_name || "there")
                            .replace(/{{last_name}}/g, sub.last_name || "")
                            .replace(/{{email}}/g, sub.email)
                            .replace(/{{unsubscribe_url}}/g, unsubscribeUrl)
                            .replace(/{{subscriber_id}}/g, sub.id);

                        // Auto-append sid to all links
                        personalHtml = personalHtml.replace(/href=([\"'])(https?:\/\/[^\"']+)\1/g, (match, quote, url) => {
                            if (url.includes('/unsubscribe')) return match;
                            const sep = url.includes('?') ? '&' : '?';
                            return `href=${quote}${url}${sep}sid=${sub.id}${quote}`;
                        });

                        // Send Email
                        const { error } = await resend.emails.send({
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
            }

            return { successCount, failureCount, sentRecords };
        });

        // 4. Update History & Status
        await step.run("update-metrics", async () => {
            const { successCount, sentRecords } = result;

            // Insert history
            if (sentRecords.length > 0) {
                const { error } = await supabase.from("sent_history").insert(sentRecords);
                if (error) console.error("Failed to insert history:", error);
            }

            // Update campaign status
            await supabase.from("campaigns").update({
                status: "completed",
                total_recipients: recipients.length
            }).eq("id", campaignId);

            return { success: true };
        });

        return {
            event: "campaign.send.completed",
            body: {
                campaignId,
                stats: {
                    sent: result.successCount,
                    failed: result.failureCount,
                    total: recipients.length
                }
            }
        };
    }
);
