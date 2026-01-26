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

            const { data, error } = await resend.emails.send({
                from: "onboarding@resend.dev", // Use this until you verify your domain
                to: email,
                subject: `[TEST] ${campaign.subject_line}`,
                html: htmlContent,
                replyTo: fromEmail,
            });

            if (error) {
                console.error("Resend Error:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

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
            const results = await Promise.all(recipients.map(async (sub) => {
                // Personalize content
                let personalHtml = htmlContent
                    .replace(/{{first_name}}/g, sub.first_name || "")
                    .replace(/{{email}}/g, sub.email);

                return resend.emails.send({
                    from: typeof fromName === 'string' && typeof fromEmail === 'string'
                        ? `${fromName} <${fromEmail}>`
                        : process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                    to: sub.email,
                    subject: campaign.subject_line,
                    html: personalHtml,
                    replyTo: fromEmail,
                });
            }));

            // 4. Update Campaign Status
            await supabase.from("campaigns").update({
                status: "sent",
                sent_at: new Date().toISOString(),
                total_recipients: recipients.length
            }).eq("id", campaignId);

            return NextResponse.json({ success: true, count: recipients.length });
        }

        return NextResponse.json({ error: "Invalid Type" }, { status: 400 });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}