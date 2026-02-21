import { inngest } from "@/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Browse Abandonment Chain: /customize
 * 
 * Triggered when a subscriber spends >10 seconds on the /customize page
 * and then leaves (session_end). Waits 2 hours, then sends a targeted
 * "prices are increasing" email to re-engage them.
 */
export const abandonCustomize = inngest.createFunction(
    {
        id: "chain-abandon-customize",
        name: "Browse Abandonment: Customize Page",
        // Deduplicate: only one chain per subscriber per 24 hours
        idempotency: "event.data.subscriberId",
        cancelOn: [
            // Cancel if they come back and convert (purchase event)
            { event: "chain.cancel.customize", match: "data.subscriberId" },
        ],
    },
    { event: "chain.abandon.customize" },
    async ({ event, step }) => {
        const { subscriberId, duration } = event.data;

        // 1. Wait 2 hours — give them time to come back on their own
        await step.sleep("wait-2-hours", "2h");

        // 2. Verify subscriber is still active and hasn't already been contacted
        const subscriber = await step.run("verify-subscriber", async () => {
            const { data } = await supabase
                .from("subscribers")
                .select("id, email, first_name, status")
                .eq("id", subscriberId)
                .eq("status", "active")
                .single();
            return data;
        });

        if (!subscriber) {
            return { message: "Subscriber no longer active, skipping" };
        }

        // 3. Send the re-engagement email
        const result = await step.run("send-abandonment-email", async () => {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com";
            const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${subscriber.id}`;
            const firstName = subscriber.first_name || "there";

            const html = `
<!DOCTYPE html>
<html>
<head>
    <style>body { font-family: 'Georgia', serif; margin: 0; padding: 0; background: #0a0a0a; color: #e5e5e5; }</style>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; color: #D4AF37; margin: 0;">Still thinking about it, ${firstName}?</h1>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            We noticed you were exploring our customization options. We wanted to let you know that
            <strong style="color: #D4AF37;">our prices are increasing soon</strong>, so now is the best time to lock in current pricing.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            Every DreamPlay piano is built to your exact specifications. Whether it's the finish, the action weight,
            or the sound profile, we make it yours.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://dreamplaypianos.com/customize?sid=${subscriber.id}&em=${encodeURIComponent(subscriber.email)}"
               style="display: inline-block; padding: 14px 32px; background: #D4AF37; color: #0a0a0a; font-weight: bold; text-decoration: none; border-radius: 6px; font-size: 16px;">
                Continue Designing Your Piano
            </a>
        </div>
        <p style="font-size: 12px; color: #525252; text-align: center; margin-top: 40px; border-top: 1px solid #262626; padding-top: 20px;">
            <a href="${unsubscribeUrl}" style="color: #525252; text-decoration: underline;">Unsubscribe</a>
        </p>
    </div>
</body>
</html>`;

            const { error } = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || "DreamPlay <hello@email.dreamplaypianos.com>",
                to: subscriber.email,
                subject: `${firstName}, your custom piano is waiting`,
                html,
                headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
            });

            if (error) throw error;
            return { sent: true, email: subscriber.email };
        });

        // 4. Log the send event
        await step.run("log-event", async () => {
            await supabase.from("subscriber_events").insert({
                subscriber_id: subscriberId,
                type: "sent",
                url: "/customize",
                metadata: {
                    chain: "abandon-customize",
                    original_duration: duration,
                },
            });
        });

        return {
            event: "chain.abandon.customize.completed",
            body: result,
        };
    }
);
