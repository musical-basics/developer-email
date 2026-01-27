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

            const { data: recipients, error: subError } = await query;
            if (subError || !recipients) throw subError;

            // 3. Loop and Send (For small batches, a simple loop is fine. For >1000, use Resend Batch API)
            console.log(`🚀 Starting broadcast to ${recipients.length} subscribers...`);

            let successCount = 0;
            let failureCount = 0;
            let firstErrorMessage = "";

            // Run the sending loop
            await Promise.all(recipients.map(async (sub) => {
                // Personalize
                let personalHtml = htmlContent
                    .replace(/href="([^"]*)"/g, (match: string, url: string) => {
                        // Don't tag "mailto:" or anchors "#"
                        if (url.startsWith("http")) {
                            const separator = url.includes("?") ? "&" : "?";
                            return `href="${url}${separator}sid=${sub.id}&cid=${campaign.id}"`;
                        }
                        return match;
                    })
                    .replace(/{{first_name}}/g, sub.first_name || "")
                    .replace(/{{email}}/g, sub.email);

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
                }
            }));

            // 4. Update Campaign Status
            await supabase.from("campaigns").update({
                status: "sent",
                sent_at: new Date().toISOString(),
                total_recipients: recipients.length
            }).eq("id", campaignId);

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