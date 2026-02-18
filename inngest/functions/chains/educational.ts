// inngest/functions/chains/educational.ts

import { inngest } from "@/inngest/client";
import { sendChainEmail } from "@/lib/chains/sender";
import { CHAIN_TEMPLATES } from "@/lib/chains/templates";
import { createClient } from "@supabase/supabase-js";

// Define the exact order of the sequence
const EDUCATIONAL_SEQUENCE: (keyof typeof CHAIN_TEMPLATES)[] = [
    "edu_1",
    "edu_2",
    "edu_3",
    "edu_4",
    "edu_5"
];

export const educationalChain = inngest.createFunction(
    { id: "educational-drip-chain" },
    { event: "chain.educational.start" },
    async ({ event, step }) => {
        const { subscriberId, email, firstName } = event.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        // State variables that Inngest will magically remember across sleep periods
        let consecutiveMisses = 0;
        let waitPeriod = "7d"; // Start with weekly frequency

        // Loop through however many emails you have in the array
        for (let i = 0; i < EDUCATIONAL_SEQUENCE.length; i++) {
            const templateKey = EDUCATIONAL_SEQUENCE[i];

            // 1. SAFETY CHECK
            const active = await step.run(`check-active-${i}`, async () => {
                const { data } = await supabase.from("subscribers").select("status").eq("id", subscriberId).single();
                return data?.status === "active";
            });
            if (!active) return { status: "halted", reason: "unsubscribed" };

            // 2. RECORD TIMESTAMP & SEND
            const sentAt = await step.run(`get-time-${i}`, () => new Date().toISOString());

            await step.run(`send-email-${i}`, async () => {
                await sendChainEmail(subscriberId, email, firstName, templateKey);
            });

            // If it's the very last email in the chain, we don't need to sleep anymore
            if (i === EDUCATIONAL_SEQUENCE.length - 1) break;

            // 3. THE DYNAMIC SLEEP
            await step.sleep(`wait-period-${i}`, waitPeriod);

            // 4. CHECK ENGAGEMENT
            const opened = await step.run(`check-engagement-${i}`, async () => {
                const { data } = await supabase.from("subscriber_events")
                    .select("id")
                    .eq("subscriber_id", subscriberId)
                    .in("type", ["open", "click"])
                    .gte("created_at", sentAt)
                    .limit(1);

                return (data && data.length > 0);
            });

            // 5. FREQUENCY CAPPING LOGIC (The Secret Sauce)
            if (opened) {
                consecutiveMisses = 0;
                waitPeriod = "7d"; // They are engaged! Restore weekly frequency.
            } else {
                consecutiveMisses++;
                if (consecutiveMisses >= 3) {
                    waitPeriod = "30d"; // Missed 3 in a row. Downgrade to monthly.
                }
            }
        }

        return { status: "completed", message: "Finished educational sequence" };
    }
);
