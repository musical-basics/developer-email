// inngest/functions/chains/generic.ts
// A single generic chain runner that loads chain definitions from the database.
// Any chain created in the UI will automatically work through this function.

import { inngest } from "@/inngest/client";
import { sendChainEmail } from "@/lib/chains/sender";
import { CHAIN_TEMPLATES } from "@/lib/chains/templates";
import { createClient } from "@supabase/supabase-js";

function parseWaitDuration(waitAfter: string): string {
    // Convert human-readable wait strings to Inngest sleep format
    // "2 days" → "2d", "7 days (dynamic)" → "7d", "1 hour" → "1h"
    const cleaned = waitAfter.replace(/\(.*\)/, "").trim().toLowerCase();
    const match = cleaned.match(/^(\d+)\s*(day|days|d|hour|hours|h|minute|minutes|min|m|week|weeks|w)$/);
    if (!match) return "1d"; // safe default

    const num = match[1];
    const unit = match[2];

    if (unit.startsWith("day") || unit === "d") return `${num}d`;
    if (unit.startsWith("hour") || unit === "h") return `${num}h`;
    if (unit.startsWith("min") || unit === "m") return `${num}m`;
    if (unit.startsWith("week") || unit === "w") return `${parseInt(num) * 7}d`;

    return `${num}d`;
}

export const genericChainRunner = inngest.createFunction(
    { id: "generic-chain-runner" },
    { event: "chain.run" },
    async ({ event, step }) => {
        const { chainId, subscriberId, email, firstName } = event.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        // ─── LOAD CHAIN FROM DB ────────────────────────────────
        const chain = await step.run("load-chain", async () => {
            const { data: chainData, error: chainError } = await supabase
                .from("email_chains")
                .select("*")
                .eq("id", chainId)
                .single();

            if (chainError || !chainData) {
                throw new Error(`Chain not found: ${chainId}`);
            }

            const { data: steps } = await supabase
                .from("chain_steps")
                .select("*")
                .eq("chain_id", chainId)
                .order("position", { ascending: true });

            const { data: branches } = await supabase
                .from("chain_branches")
                .select("*")
                .eq("chain_id", chainId)
                .order("position", { ascending: true });

            return {
                ...chainData,
                steps: steps || [],
                branches: branches || [],
            };
        });

        // Helper: Check if subscriber is still active before sending
        const checkActive = async () => {
            const { data } = await supabase
                .from("subscribers")
                .select("status")
                .eq("id", subscriberId)
                .single();
            return data?.status === "active";
        };

        // ─── EXECUTE STEPS SEQUENTIALLY ────────────────────────
        const sentCampaignIds: string[] = [];

        for (let i = 0; i < chain.steps.length; i++) {
            const stepDef = chain.steps[i];
            const templateKey = stepDef.template_key as keyof typeof CHAIN_TEMPLATES;
            const template = CHAIN_TEMPLATES[templateKey];

            // Safety check: is subscriber still active?
            const active = await step.run(`check-active-${i}`, checkActive);
            if (!active) return { status: "halted", reason: "unsubscribed", stepsCompleted: i };

            // Send the email
            await step.run(`send-step-${i}-${stepDef.label}`, async () => {
                await sendChainEmail(subscriberId, email, firstName, templateKey);
            });

            if (template) {
                sentCampaignIds.push(template.campaign_id);
            }

            // Wait if there's a wait period and it's not the last step
            if (stepDef.wait_after && i < chain.steps.length - 1) {
                const duration = parseWaitDuration(stepDef.wait_after);
                await step.sleep(`wait-after-step-${i}`, duration);
            }
        }

        // ─── BRANCHING (if defined) ────────────────────────────
        if (chain.branches.length > 0 && sentCampaignIds.length > 0) {
            // Wait for engagement data to accumulate
            await step.sleep("wait-for-engagement", "2d");

            const engagement = await step.run("check-engagement", async () => {
                const { data: events } = await supabase
                    .from("subscriber_events")
                    .select("type")
                    .eq("subscriber_id", subscriberId)
                    .in("campaign_id", sentCampaignIds);

                const clicked = events?.some((e: any) => e.type === "click") || false;
                const opened = events?.some((e: any) => e.type === "open") || false;

                return { clicked, opened };
            });

            // Apply branching logic based on engagement
            // Branch 1 = highest engagement (clicked), Branch 2 = medium (opened), Branch 3+ = lowest (ghosted)
            let matchedBranch = chain.branches[chain.branches.length - 1]; // default to last (lowest)

            if (engagement.clicked && chain.branches.length >= 1) {
                matchedBranch = chain.branches[0]; // High interest
            } else if (engagement.opened && chain.branches.length >= 2) {
                matchedBranch = chain.branches[1]; // Low interest
            }

            // Tag the subscriber with the branch label
            await step.run(`tag-${matchedBranch.label}`, async () => {
                const { data: user } = await supabase
                    .from("subscribers")
                    .select("tags")
                    .eq("id", subscriberId)
                    .single();

                const tags = new Set(user?.tags || []);
                tags.add(matchedBranch.label);
                await supabase
                    .from("subscribers")
                    .update({ tags: Array.from(tags) })
                    .eq("id", subscriberId);
            });

            return {
                status: "completed",
                branch: matchedBranch.label,
                stepsCompleted: chain.steps.length,
            };
        }

        return {
            status: "completed",
            stepsCompleted: chain.steps.length,
        };
    }
);
