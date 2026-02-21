import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendCampaign } from "@/inngest/functions/send-campaign";
import { dreamplayChain } from "@/inngest/functions/chains/dreamplay";
import { educationalChain } from "@/inngest/functions/chains/educational";
import { genericChainRunner } from "@/inngest/functions/chains/generic";
import { audienceEnrichment } from "@/inngest/functions/audience-enrichment";
import { customizeAbandonment } from "@/inngest/functions/chains/behavioral";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendCampaign,
        dreamplayChain,
        educationalChain,
        genericChainRunner,
        audienceEnrichment,
        customizeAbandonment,
    ],
});
