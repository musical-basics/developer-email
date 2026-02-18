import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendCampaign } from "@/inngest/functions/send-campaign";
import { dreamplayChain } from "@/inngest/functions/chains/dreamplay";
import { educationalChain } from "@/inngest/functions/chains/educational";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendCampaign,
        dreamplayChain,
        educationalChain,
    ],
});
