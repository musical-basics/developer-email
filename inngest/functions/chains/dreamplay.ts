// inngest/functions/chains/dreamplay.ts

import { inngest } from "@/inngest/client";
import { sendChainEmail } from "@/lib/chains/sender";
import { CHAIN_TEMPLATES } from "@/lib/chains/templates";
import { createClient } from "@supabase/supabase-js";

export const dreamplayChain = inngest.createFunction(
    { id: "dreamplay-onboarding-chain" },
    { event: "chain.dreamplay.start" },
    async ({ event, step }) => {
        const { subscriberId, email, firstName } = event.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        // Helper: Check if they are still active before sending
        const checkActive = async () => {
            const { data } = await supabase.from("subscribers").select("status").eq("id", subscriberId).single();
            return data?.status === "active";
        };

        // --------------------------------------------------------
        // STAGE 1: THE INTRO
        // --------------------------------------------------------
        const active1 = await step.run("check-status-1", checkActive);
        if (!active1) return { status: "halted", reason: "unsubscribed" };

        await step.run("send-intro", async () => {
            await sendChainEmail(subscriberId, email, firstName, "dp_intro");
        });

        // Wait 2 days
        await step.sleep("wait-after-intro", "2d");

        // --------------------------------------------------------
        // STAGE 2: THE CROWDFUND ANNOUNCEMENT
        // --------------------------------------------------------
        const active2 = await step.run("check-status-2", checkActive);
        if (!active2) return { status: "halted", reason: "unsubscribed" };

        await step.run("send-crowdfund", async () => {
            await sendChainEmail(subscriberId, email, firstName, "dp_crowdfund");
        });

        // Wait 2 more days to give them time to read and click
        await step.sleep("wait-for-engagement", "2d");

        // --------------------------------------------------------
        // STAGE 3: THE BEHAVIOR CHECK
        // --------------------------------------------------------
        const engagement = await step.run("check-engagement", async () => {
            const { data: events } = await supabase.from("subscriber_events")
                .select("type")
                .eq("subscriber_id", subscriberId)
                .in("campaign_id", [CHAIN_TEMPLATES.dp_intro.campaign_id, CHAIN_TEMPLATES.dp_crowdfund.campaign_id]);

            const clicked = events?.some(e => e.type === "click") || false;
            const opened = events?.some(e => e.type === "open") || false;

            return { clicked, opened };
        });

        // --------------------------------------------------------
        // STAGE 4: THE BRANCHING
        // --------------------------------------------------------
        if (engagement.clicked) {

            // --- HIGH INTEREST: They clicked a link! ---
            await step.run("tag-high-interest", async () => {
                const { data: user } = await supabase.from("subscribers").select("tags").eq("id", subscriberId).single();
                const tags = new Set(user?.tags || []);
                tags.add("DreamPlay High Interest");
                await supabase.from("subscribers").update({ tags: Array.from(tags) }).eq("id", subscriberId);
            });

            const active3 = await step.run("check-status-3", checkActive);
            if (!active3) return { status: "halted", reason: "unsubscribed" };

            // Send them the final hard push (Urgency/Price doubling)
            await step.run("send-urgency", async () => {
                await sendChainEmail(subscriberId, email, firstName, "dp_urgency");
            });

            return { status: "chain_completed", branch: "high_interest" };

        } else if (engagement.opened) {

            // --- LOW INTEREST: They opened, but didn't click. ---
            await step.run("tag-low-interest", async () => {
                const { data: user } = await supabase.from("subscribers").select("tags").eq("id", subscriberId).single();
                const tags = new Set(user?.tags || []);
                tags.add("DreamPlay Low Interest");
                await supabase.from("subscribers").update({ tags: Array.from(tags) }).eq("id", subscriberId);
            });

            // Move them to a completely different chain (e.g., Educational loop)
            await step.sendEvent("trigger-educational-chain", {
                name: "chain.educational.start",
                data: { subscriberId, email, firstName }
            });

            return { status: "handed_off", branch: "low_interest" };

        } else {

            // --- GHOSTED: They didn't even open the emails. ---
            await step.sendEvent("trigger-educational-chain-ghost", {
                name: "chain.educational.start",
                data: { subscriberId, email, firstName }
            });

            return { status: "handed_off", branch: "ghosted" };
        }
    }
);
