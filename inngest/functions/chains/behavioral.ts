import { inngest } from "@/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { sendChainEmail } from "@/lib/chains/sender";
import { generateJITDraft } from "@/app/actions/jit-actions";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// The safe, pre-written fallback template for cart abandonment
const FALLBACK_TEMPLATE = "dp_urgency";

/**
 * Customize Page Abandonment — HITL Workflow
 * 
 * Flow:
 *   1. Wait 2 hours
 *   2. Purchase check → halt if converted
 *   3. Engagement routing:
 *      - Low/Medium engagement → send standard pre-written email immediately
 *      - High engagement → generate AI draft → wait 24h for admin approval
 *   4. If approved → send AI draft. If rejected/timeout → send standard fallback.
 */
export const customizeAbandonment = inngest.createFunction(
    {
        id: "chain-customize-abandonment",
        name: "Behavioral: Customize Abandonment (HITL)",
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

        // ─── STEP 3: Fetch subscriber for engagement routing ─
        const subscriber = await step.run("fetch-subscriber", async () => {
            const { data } = await supabase
                .from("subscribers")
                .select("id, email, first_name, smart_tags, tags")
                .eq("id", subscriberId)
                .eq("status", "active")
                .single();
            return data;
        });

        if (!subscriber) {
            return { status: "halted", reason: "subscriber_not_found" };
        }

        const engagement = subscriber.smart_tags?.engagement || "low";

        // ─── STEP 4: Route by Engagement ────────────────
        if (engagement !== "high") {
            // Low/Medium engagement → send safe pre-written template immediately
            const result = await step.run("send-standard-email", async () => {
                return sendChainEmail(
                    subscriber.id,
                    subscriber.email,
                    subscriber.first_name || "there",
                    FALLBACK_TEMPLATE
                );
            });

            return {
                status: "sent_standard",
                engagement,
                body: result,
            };
        }

        // ─── STEP 5: High Engagement → Generate AI Draft ─
        const draft = await step.run("generate-ai-draft", async () => {
            return generateJITDraft(
                subscriberId,
                `Cart abandonment: spent ${duration}s on /customize. Offer to answer questions about the 15/16th size, mention Founder's Batch pricing ending soon.`
            );
        });

        if ("error" in draft) {
            // AI draft failed — fall back to standard
            const result = await step.run("fallback-on-draft-error", async () => {
                return sendChainEmail(
                    subscriber.id,
                    subscriber.email,
                    subscriber.first_name || "there",
                    FALLBACK_TEMPLATE
                );
            });

            return {
                status: "sent_standard_fallback",
                reason: "draft_generation_failed",
                error: draft.error,
                body: result,
            };
        }

        // ─── STEP 6: The Human Pause — Wait up to 24h for approval ─
        const approval = await step.waitForEvent("wait-for-admin-approval", {
            event: "jit.decision",
            timeout: "24h",
            match: "data.campaignId",
        });

        // ─── STEP 7: Execute or Fallback ────────────────
        if (approval?.data?.decision === "approved") {
            // Admin approved → send the AI draft
            const result = await step.run("send-approved-draft", async () => {
                return sendChainEmail(
                    subscriber.id,
                    subscriber.email,
                    subscriber.first_name || "there",
                    draft.campaignId // Send the AI-generated campaign
                );
            });

            // Mark draft as completed
            await step.run("mark-draft-completed", async () => {
                await supabase
                    .from("campaigns")
                    .update({ status: "completed" })
                    .eq("id", draft.campaignId);
            });

            return {
                status: "sent_ai_approved",
                campaignId: draft.campaignId,
                body: result,
            };
        }

        // Rejected or timeout → send standard fallback
        const fallbackResult = await step.run("send-fallback", async () => {
            return sendChainEmail(
                subscriber.id,
                subscriber.email,
                subscriber.first_name || "there",
                FALLBACK_TEMPLATE
            );
        });

        // Mark the AI draft as rejected/expired
        await step.run("mark-draft-expired", async () => {
            const newStatus = approval?.data?.decision === "rejected" ? "rejected" : "expired";
            await supabase
                .from("campaigns")
                .update({ status: newStatus })
                .eq("id", draft.campaignId);
        });

        return {
            status: approval ? "sent_fallback_rejected" : "sent_fallback_timeout",
            campaignId: draft.campaignId,
            body: fallbackResult,
        };
    }
);
