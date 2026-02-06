import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ⚡️ CRITICAL CHANGE: We use the SERVICE_KEY (Admin) instead of the ANON_KEY.
// This allows the backend to read your Campaign data without needing the user's cookies.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { campaignId, type, email, fromName, fromEmail } = body;

        // 1. Fetch Campaign (Admin Access - No 404s!)
        const { data: campaign, error: campaignError } = await supabase
            .from("campaigns")
            .select("*")
            .eq("id", campaignId)
            .single();

        if (campaignError || !campaign) {
            console.error("Supabase Error:", campaignError);
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // 2. The Compiler: Replace {{variables}}
        let htmlContent = campaign.html_content || "";
        const variables = campaign.variable_values || {};

        // Replace standard variables
        Object.keys(variables).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            htmlContent = htmlContent.replace(regex, variables[key]);
        });

        // 3. Send Logic
        if (type === "test") {
            if (!email) return NextResponse.json({ error: "Test email required" }, { status: 400 });

            // ⚡️ NEW: Fetch a "Simulated" Subscriber to populate merge tags
            // If the campaign is locked to a specific subscriber (your "CRM mode"), use them.
            // Otherwise, just grab the most recent active subscriber to use as a "dummy".
            let simulationSubscriber = null;
            const lockedSubscriberId = campaign.variable_values?.subscriber_id;

            if (lockedSubscriberId) {
                const { data } = await supabase
                    .from("subscribers")
                    .select("*")
                    .eq("id", lockedSubscriberId)
                    .single();
                simulationSubscriber = data;
            } else {
                // Just grab the latest person to test layout with real data length/formatting
                const { data } = await supabase
                    .from("subscribers")
                    .select("*")
                    .eq("status", "active")
                    .limit(1)
                    .single();
                simulationSubscriber = data;
            }

            // ⚡️ NEW: Run the EXACT same replacement logic as broadcast
            let finalHtml = htmlContent;
            if (simulationSubscriber) {
                finalHtml = finalHtml
                    .replace(/{{first_name}}/g, simulationSubscriber.first_name || "There")
                    .replace(/{{last_name}}/g, simulationSubscriber.last_name || "")
                    .replace(/{{email}}/g, simulationSubscriber.email);
            } else {
                // Fallback if your list is completely empty
                finalHtml = finalHtml
                    .replace(/{{first_name}}/g, "[Test Name]")
                    .replace(/{{email}}/g, "test@example.com");
            }

            console.log("🚀 Sending Test Email...");
            console.log("FROM:", `DreamPlay <hello@email.dreamplaypianos.com>`);
            console.log("TO:", email);

            const { data, error } = await resend.emails.send({
                from: "DreamPlay <hello@email.dreamplaypianos.com>",
                to: email,
                subject: `[TEST] ${campaign.subject_line}`,
                html: finalHtml,
            });

            if (error) {
                // 🛑 THIS PRINTS THE REAL ERROR TO YOUR TERMINAL
                console.error("❌ RESEND FAILED:", JSON.stringify(error, null, 2));

                // This ensures the frontend gets a 500 error instead of a fake 200 OK
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            console.log("✅ Email sent successfully!", data);
            return NextResponse.json({ success: true, data });
        }

        else if (type === "broadcast") {
            // 1. Check for a "Subscriber Lock" (The feature you built in actions/campaigns.ts)
            const lockedSubscriberId = campaign.variable_values?.subscriber_id;

            let query = supabase.from("subscribers").select("*").eq("status", "active");

            // 2. If locked, ONLY fetch that one subscriber. Otherwise fetch everyone.
            if (lockedSubscriberId) {
                query = query.eq("id", lockedSubscriberId);
            }
            // ⚡️ FINAL GUARDRAIL: Never send to unsubscribed users (redundant with .eq('status', 'active') but explicitly safe)
            query = query.neq('status', 'unsubscribed');

            const { data: recipients, error: subError } = await query;
            if (subError || !recipients) throw subError;

            // 3. Loop and Send (For small batches, a simple loop is fine. For >1000, use Resend Batch API)
            console.log(`🚀 Starting broadcast to ${recipients.length} subscribers...`);

            // ⚡️ GLOBAL FOOTER
            const unsubscribeFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
  <p style="margin: 0;">
    No longer want to receive these emails? 
    <a href="{{unsubscribe_url}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.
  </p>
</div>
`;

            let successCount = 0;
            let failureCount = 0;
            let firstErrorMessage = "";
            const sentRecords: { campaign_id: string; subscriber_id: string; sent_at: string; variant_sent: string | null }[] = [];

            // Append footer ONCE to the base template
            const htmlWithFooter = htmlContent + unsubscribeFooter;

            // Run the sending loop
            await Promise.all(recipients.map(async (sub) => {
                // Personalize
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com"

                // Generate Unsubscribe Link
                const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${sub.id}&c=${campaignId}`;

                // Helper to wrap links for tracking
                const wrapLinks = (html: string, campaignId: string, subscriberId: string) => {
                    return html.replace(/href=(["'])([^"']+)\1/g, (match, quote, url) => {
                        // Don't wrap mailto, tel, or anchors
                        if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
                            return match
                        }

                        // Encode the target URL
                        const encodedUrl = encodeURIComponent(url)
                        const trackingUrl = `${baseUrl}/api/track/click?u=${encodedUrl}&c=${campaignId}&s=${subscriberId}`

                        return `href=${quote}${trackingUrl}${quote}`
                    })
                }

                // Render with variables including unsubscribe_url
                // Note: We used to replace {{variables}} manually above, but for broadcast we might need per-user replacement again?
                // Actually, the code above `htmlContent.replace` (line 36) replaced GLOBAL variables.
                // We need to support per-user variables like {{first_name}} AND {{unsubscribe_url}}.
                // The existing code did manual replacement for first_name/email.
                // WE SHOULD USE `renderTemplate` if available, but it's not imported here? 
                // Wait, checking top of file... no import.
                // But lines 72-80 do manual replacement.
                // And line 38 does simple replace.

                // Refactoring to unify replacement:
                let personalHtml = htmlWithFooter;

                // 1. Replace Standard Variables (Already done in `htmlContent` for globals, but just in case)
                // (Assuming `htmlContent` has globals replaced)

                // 2. Replace Personal Variables
                personalHtml = personalHtml
                    .replace(/{{first_name}}/g, sub.first_name || "there")
                    .replace(/{{last_name}}/g, sub.last_name || "")
                    .replace(/{{email}}/g, sub.email)
                    .replace(/{{unsubscribe_url}}/g, unsubscribeUrl); // Inject URL

                // 2. Wrap Links for Click Tracking
                personalHtml = wrapLinks(personalHtml, campaignId, sub.id)

                // 3. Inject Open Tracking Pixel at the bottom
                const trackingPixel = `<img src="${baseUrl}/api/track/open?c=${campaignId}&s=${sub.id}" width="1" height="1" style="display:none;" alt="" />`
                if (personalHtml.includes("</body>")) {
                    personalHtml = personalHtml.replace("</body>", `${trackingPixel}</body>`)
                } else {
                    personalHtml += trackingPixel
                }

                const { error } = await resend.emails.send({
                    from: typeof fromName === 'string' && typeof fromEmail === 'string'
                        ? `${fromName} <${fromEmail}>`
                        : process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                    to: sub.email,
                    subject: campaign.subject_line,
                    html: personalHtml,
                    replyTo: fromEmail,
                });

                if (error) {
                    console.error(`❌ Failed: ${sub.email}`, error);
                    failureCount++;
                    if (!firstErrorMessage) firstErrorMessage = error.message; // Capture the first reason
                } else {
                    successCount++;
                    // Track successful send for sent_history
                    sentRecords.push({
                        campaign_id: campaignId,
                        subscriber_id: sub.id,
                        sent_at: new Date().toISOString(),
                        variant_sent: campaign.subject_line || null
                    });
                }
            }));

            // 4. Insert sent_history records (batch insert for performance)
            if (sentRecords.length > 0) {
                const { error: historyError } = await supabase
                    .from("sent_history")
                    .insert(sentRecords);

                if (historyError) {
                    console.error("❌ Failed to insert sent_history:", historyError);
                } else {
                    console.log(`📊 Logged ${sentRecords.length} sends to sent_history`);
                }
            }

            // 5. Update Campaign Status
            const { error: updateError } = await supabase.from("campaigns").update({
                status: "completed",
                total_audience_size: recipients.length
            }).eq("id", campaignId);

            if (updateError) {
                console.error("❌ Failed to update campaign status:", updateError);
            } else {
                console.log(`✅ Campaign status updated to 'completed'`);
            }

            // ⚡️ NEW: Return the actual score card
            if (failureCount > 0) {
                return NextResponse.json({
                    success: false,
                    message: `Sent ${successCount}, Failed ${failureCount}. Reason: ${firstErrorMessage}`
                }, { status: 500 }); // Return 500 so the UI knows it failed
            }

            return NextResponse.json({
                success: true,
                message: `Successfully sent to ${successCount} subscribers`
            });
        }

        return NextResponse.json({ error: "Invalid Type" }, { status: 400 });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}