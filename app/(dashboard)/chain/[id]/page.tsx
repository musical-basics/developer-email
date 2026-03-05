import { getChainWithCampaignDetails } from "@/app/actions/chains"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ChainLaunchChecks } from "@/components/chain/chain-launch-checks"

interface ChainPageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ subscriberId?: string }>
}

export default async function ChainPage({ params, searchParams }: ChainPageProps) {
    const { id } = await params
    const { subscriberId } = await searchParams

    // Fetch chain with enriched campaign details
    const { data: chain, error } = await getChainWithCampaignDetails(id)

    if (error || !chain) {
        notFound()
    }

    // Fetch subscriber info if provided
    let subscriber = null
    let alreadySentCampaignIds: string[] = []

    if (subscriberId) {
        const supabase = await createClient()

        const [subResult, sentResult] = await Promise.all([
            supabase
                .from("subscribers")
                .select("id, email, first_name, last_name, tags, status")
                .eq("id", subscriberId)
                .single(),
            // Check which campaigns in this chain the subscriber has already received
            supabase
                .from("sent_history")
                .select("campaign_id")
                .eq("subscriber_id", subscriberId)
                .in("campaign_id", chain.steps.map(s => s.template_key).filter(Boolean)),
        ])

        subscriber = subResult.data
        if (sentResult.data) {
            alreadySentCampaignIds = sentResult.data.map(r => r.campaign_id)
        }
    }

    return (
        <ChainLaunchChecks
            chain={chain}
            subscriber={subscriber}
            alreadySentCampaignIds={alreadySentCampaignIds}
        />
    )
}
