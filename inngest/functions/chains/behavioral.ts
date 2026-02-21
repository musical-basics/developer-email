import { inngest } from "@/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { generateAndSendJITEmail } from "@/lib/chains/sender";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Customize Page Abandonment Chain
 * 
 * Triggered when a subscriber spends >10s on /customize and leaves.
 * Guards:
 *   1. 2-hour wait (let them come back on their own)
 *   2. Purchase check (don't email if they already bought)
 *   3. Cooldown check (14-day window between JIT emails)
 * Then: generates a bespoke AI email via Claude.
 */
export const customizeAbandonment = inngest.createFunction(
    {
        id: "chain-customize-abandonment",
        name: "Behavioral: Customize Abandonment",
        // Deduplicate: one chain per subscriber per 24 hours
        idempotency: "event.data.subscriberId",
    },
    { event: "chain.abandon.customize" },
    async ({ event, step }) => {
        const { subscriberId, duration } = event.data;

        // ─── STEP 1: Wait 2 hours ───────────────────────
        await step.sleep("wait-for-purchase", "2h");

        // ─── STEP 2: Purchase Check ─────────────────────
        const purchased = await step.run("check-purchase", async () => {
            const twoHoursAgo = new Date();
            twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

            const { data } = await supabase
                .from("subscriber_events")
                .select("id")
                .eq("subscriber_id", subscriberId)
                .in("type", ["conversion_t3", "conversion_t2"])
                .gte("created_at", twoHoursAgo.toISOString())
                .limit(1);

            return (data && data.length > 0);
        });

        if (purchased) {
            return { status: "halted", reason: "purchased" };
        }

        // ─── STEP 3: Cooldown Check ─────────────────────
        const inCooldown = await step.run("check-cooldown", async () => {
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

            const { data } = await supabase
                .from("subscriber_events")
                .select("id")
                .eq("subscriber_id", subscriberId)
                .eq("type", "sent")
                .contains("metadata", { chain: "jit" })
                .gte("created_at", fourteenDaysAgo.toISOString())
                .limit(1);

            return (data && data.length > 0);
        });

        if (inCooldown) {
            return { status: "halted", reason: "cooldown_14d" };
        }

        // ─── STEP 4: Generate & Send JIT Email ──────────
        const result = await step.run("send-jit-email", async () => {
            return generateAndSendJITEmail(
                subscriberId,
                `They spent ${duration} seconds looking at the customizer but didn't buy. Offer to answer any questions about the 15/16th size, and gently remind them the Founder's Batch pricing ends soon.`
            );
        });

        return {
            status: "sent",
            body: result,
        };
    }
);
