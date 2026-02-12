import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderTemplate } from "@/lib/render-template";
import { inngest } from "@/inngest/client";

const resend = new Resend(process.env.RESEND_API_KEY);

// Admin client for data fetching (bypassing RLS for campaign data)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
    // 1. Secure the API (Task 3)
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { campaignId, type, email, fromName, fromEmail } = body;

        // 2. Fetch Campaign
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .select("*")
            .eq("id", campaignId)
            .single();

        if (campaignError || !campaign) {
            console.error("Supabase Error:", campaignError);
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // 3. Render Global Template
        const globalHtmlContent = renderTemplate(campaign.html_content || "", campaign.variable_values || {});
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
                    .replace(/{{first_name}}/g, simulationSubscriber.first_name || "There")
                    .replace(/{{last_name}}/g, simulationSubscriber.last_name || "")
                    .replace(/{{email}}/g, simulationSubscriber.email);
            } else {
                finalHtml = finalHtml
                    .replace(/{{first_name}}/g, "[Test Name]")
                    .replace(/{{email}}/g, "test@example.com");
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
            // Task 2: Trigger Inngest
            console.log(`🚀 Queuing broadcast for campaign ${campaignId}`);

            await inngest.send({
                name: "campaign.send",
                data: { campaignId }
            });

            return NextResponse.json({
                success: true,
                message: "Campaign queued successfully"
            });
        }

        return NextResponse.json({ error: "Invalid Type" }, { status: 400 });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}