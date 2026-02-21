import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Look up subscriber + most recent campaign from email address
async function resolveSubscriber(email: string) {
    // 1. Find subscriber by email
    const { data: subscriber } = await supabase
        .from("subscribers")
        .select("id")
        .eq("email", email)
        .single();

    if (!subscriber) return null;

    // 2. Find the most recent sent_history for this subscriber to get campaign_id
    const { data: history } = await supabase
        .from("sent_history")
        .select("campaign_id")
        .eq("subscriber_id", subscriber.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .single();

    return {
        subscriberId: subscriber.id,
        campaignId: history?.campaign_id || null,
    };
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const events = Array.isArray(payload) ? payload : [payload];

        for (const event of events) {
            const { type, data } = event;
            const email = data?.to?.[0];
            if (!email) continue;

            // ── OPEN ────────────────────────────────────────
            if (type === "email.opened") {
                const resolved = await resolveSubscriber(email);
                if (resolved) {
                    await supabase.from("subscriber_events").insert({
                        type: "open",
                        subscriber_id: resolved.subscriberId,
                        campaign_id: resolved.campaignId,
                    });
                    console.log(`[Webhook] Open tracked for ${email}`);
                }
            }

            // ── CLICK ───────────────────────────────────────
            else if (type === "email.link_clicked") {
                const resolved = await resolveSubscriber(email);
                if (resolved) {
                    await supabase.from("subscriber_events").insert({
                        type: "click",
                        subscriber_id: resolved.subscriberId,
                        campaign_id: resolved.campaignId,
                        url: data?.click?.link || null,
                    });
                    console.log(`[Webhook] Click tracked for ${email}: ${data?.click?.link}`);
                }
            }

            // ── BOUNCE ──────────────────────────────────────
            else if (type === "email.bounced") {
                console.log(`[Webhook] Bounce for ${email}`);
                // Update subscriber status
                await supabase
                    .from("subscribers")
                    .update({ status: "bounced" })
                    .eq("email", email);

                // Also log as event for analytics
                const resolved = await resolveSubscriber(email);
                if (resolved) {
                    await supabase.from("subscriber_events").insert({
                        type: "bounce",
                        subscriber_id: resolved.subscriberId,
                        campaign_id: resolved.campaignId,
                    });
                }
            }

            // ── COMPLAINT (Spam Report) ─────────────────────
            else if (type === "email.complained") {
                console.log(`[Webhook] Complaint (spam report) for ${email}`);
                // Update subscriber status
                await supabase
                    .from("subscribers")
                    .update({ status: "unsubscribed" })
                    .eq("email", email);

                // Also log as event for analytics
                const resolved = await resolveSubscriber(email);
                if (resolved) {
                    await supabase.from("subscriber_events").insert({
                        type: "complaint",
                        subscriber_id: resolved.subscriberId,
                        campaign_id: resolved.campaignId,
                    });
                }
            }
        }

        return NextResponse.json({ received: true });

    } catch (e: any) {
        console.error("Webhook Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
