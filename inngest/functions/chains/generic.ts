// inngest/functions/chains/generic.ts
// A state-machine chain runner that syncs every step to the chain_processes DB table.
// Supports pause/resume via waitForEvent and instant cancellation via cancelOn.

import { inngest } from "@/inngest/client";
import { sendChainEmail } from "@/lib/chains/sender";
import { createClient } from "@supabase/supabase-js";

function parseWaitDuration(waitAfter: string): { inngestDuration: string; ms: number } {
    // Convert human-readable wait strings to Inngest sleep format + milliseconds
    const cleaned = waitAfter.replace(/\(.*\)/, "").trim().toLowerCase();
    const match = cleaned.match(/^(\d+)\s*(day|days|d|hour|hours|h|minute|minutes|min|m|week|weeks|w)$/);
    if (!match) return { inngestDuration: "1d", ms: 86400000 };

    const num = parseInt(match[1]);
    const unit = match[2];

    if (unit.startsWith("day") || unit === "d") return { inngestDuration: `${num}d`, ms: num * 86400000 };
    if (unit.startsWith("hour") || unit === "h") return { inngestDuration: `${num}h`, ms: num * 3600000 };
    if (unit.startsWith("min") || unit === "m") return { inngestDuration: `${num}m`, ms: num * 60000 };
    if (unit.startsWith("week") || unit === "w") return { inngestDuration: `${num * 7}d`, ms: num * 7 * 86400000 };

    return { inngestDuration: `${num}d`, ms: num * 86400000 };
}

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );
}

export const genericChainRunner = inngest.createFunction(
    {
        id: "generic-chain-runner",
        cancelOn: [{ event: "chain.cancel", match: "data.processId" }],
    },
    { event: "chain.run" },
    async ({ event, step }) => {
        const { processId, chainId, subscriberId, email, firstName } = event.data;
        const supabase = getSupabase();

        // ─── Helper: Append to process history in DB ───
        const appendHistory = async (stepName: string, action: string, details?: string) => {
            const { data: proc } = await supabase
                .from("chain_processes")
                .select("history")
                .eq("id", processId)
                .single();

            const history = proc?.history || [];
            history.push({
                step_name: stepName,
                action,
                timestamp: new Date().toISOString(),
                ...(details ? { details } : {}),
            });

            await supabase
                .from("chain_processes")
                .update({ history, updated_at: new Date().toISOString() })
                .eq("id", processId);
        };

        // ─── LOAD CHAIN FROM DB ────────────────────────
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

        // Helper: Check if subscriber is still active
        const checkActive = async () => {
            const { data } = await supabase
                .from("subscribers")
                .select("status")
                .eq("id", subscriberId)
                .single();
            return data?.status === "active";
        };

        // Helper: Check process status from DB
        const checkProcessStatus = async () => {
            const { data } = await supabase
                .from("chain_processes")
                .select("status")
                .eq("id", processId)
                .single();
            return data?.status as string;
        };

        // ─── EXECUTE STEPS SEQUENTIALLY ────────────────
        const sentCampaignIds: string[] = [];

        // If processId exists, load current_step_index to resume from where we left off
        let startIndex = 0;
        if (processId) {
            const { data: proc } = await supabase
                .from("chain_processes")
                .select("current_step_index")
                .eq("id", processId)
                .single();
            startIndex = proc?.current_step_index || 0;
        }

        for (let i = startIndex; i < chain.steps.length; i++) {
            const stepDef = chain.steps[i];

            // ─── PAUSE CHECK ───────────────────────────
            if (processId) {
                const status = await step.run(`check-status-${i}`, checkProcessStatus);

                if (status === "cancelled") {
                    return { status: "cancelled", stepsCompleted: i };
                }

                if (status === "paused") {
                    await step.run(`log-pause-wait-${i}`, () =>
                        appendHistory("System", "Waiting for Resume", `Paused before step: ${stepDef.label}`)
                    );

                    // Wait indefinitely for a resume event (up to 365 days)
                    const resumeEvent = await step.waitForEvent(`wait-for-resume-${i}`, {
                        event: "chain.resume",
                        timeout: "365d",
                        match: "data.processId",
                    });

                    if (!resumeEvent) {
                        // Timed out waiting — treat as cancelled
                        await step.run(`log-timeout-${i}`, () =>
                            appendHistory("System", "Timed Out Waiting for Resume")
                        );
                        return { status: "cancelled", reason: "timeout", stepsCompleted: i };
                    }

                    // Re-check after resume — could have been cancelled while paused
                    const postResumeStatus = await step.run(`recheck-status-${i}`, checkProcessStatus);
                    if (postResumeStatus === "cancelled") {
                        return { status: "cancelled", stepsCompleted: i };
                    }
                }
            }

            // ─── SUBSCRIBER ACTIVE CHECK ───────────────
            const active = await step.run(`check-active-${i}`, checkActive);
            if (!active) {
                if (processId) {
                    await step.run(`log-unsub-${i}`, async () => {
                        await appendHistory("System", "Chain Halted", "Subscriber unsubscribed");
                        await supabase.from("chain_processes").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", processId);
                    });
                }
                return { status: "halted", reason: "unsubscribed", stepsCompleted: i };
            }

            // ─── SEND EMAIL ────────────────────────────
            const sendResult = await step.run(`send-step-${i}-${stepDef.label}`, async () => {
                return await sendChainEmail(subscriberId, email, firstName, stepDef.template_key);
            });

            if (sendResult && sendResult.campaignId) {
                sentCampaignIds.push(sendResult.campaignId);
            }

            // ─── LOG TO DB ─────────────────────────────
            if (processId) {
                await step.run(`log-sent-${i}`, async () => {
                    await appendHistory(stepDef.label, "Email Sent", `Campaign: ${sendResult?.campaignId || "N/A"}`);
                    await supabase.from("chain_processes").update({
                        current_step_index: i + 1,
                        updated_at: new Date().toISOString(),
                    }).eq("id", processId);
                });
            }

            // ─── WAIT PERIOD ───────────────────────────
            if (stepDef.wait_after && i < chain.steps.length - 1) {
                const { inngestDuration, ms } = parseWaitDuration(stepDef.wait_after);
                const nextStepAt = new Date(Date.now() + ms);

                // Save exact wake-up time to DB so the UI can show countdown
                if (processId) {
                    await step.run(`set-next-step-at-${i}`, async () => {
                        await appendHistory(stepDef.label, "Waiting", `Next step at ${nextStepAt.toISOString()} (${stepDef.wait_after})`);
                        await supabase.from("chain_processes").update({
                            next_step_at: nextStepAt.toISOString(),
                            updated_at: new Date().toISOString(),
                        }).eq("id", processId);
                    });
                }

                await step.sleepUntil(`wait-after-step-${i}`, nextStepAt);

                // Clear next_step_at after waking up
                if (processId) {
                    await step.run(`clear-next-step-at-${i}`, async () => {
                        await supabase.from("chain_processes").update({
                            next_step_at: null,
                            updated_at: new Date().toISOString(),
                        }).eq("id", processId);
                    });
                }
            }
        }

        // ─── BRANCHING (if defined) ────────────────────
        if (chain.branches.length > 0 && sentCampaignIds.length > 0) {
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

            let matchedBranch = chain.branches[chain.branches.length - 1];

            if (engagement.clicked && chain.branches.length >= 1) {
                matchedBranch = chain.branches[0];
            } else if (engagement.opened && chain.branches.length >= 2) {
                matchedBranch = chain.branches[1];
            }

            // Tag the subscriber
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

            // Log branching to process history
            if (processId) {
                await step.run("log-branch", async () => {
                    await appendHistory("Branching", `Matched: ${matchedBranch.label}`, `Clicked: ${engagement.clicked}, Opened: ${engagement.opened}`);
                    await supabase.from("chain_processes").update({
                        status: "completed",
                        updated_at: new Date().toISOString(),
                    }).eq("id", processId);
                });
            }

            return {
                status: "completed",
                branch: matchedBranch.label,
                stepsCompleted: chain.steps.length,
            };
        }

        // ─── MARK COMPLETED ────────────────────────────
        if (processId) {
            await step.run("log-completed", async () => {
                await appendHistory("System", "Chain Completed");
                await supabase.from("chain_processes").update({
                    status: "completed",
                    next_step_at: null,
                    updated_at: new Date().toISOString(),
                }).eq("id", processId);
            });
        }

        return {
            status: "completed",
            stepsCompleted: chain.steps.length,
        };
    }
);
