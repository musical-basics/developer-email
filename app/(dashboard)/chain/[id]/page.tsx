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
    if (subscriberId) {
        const supabase = await createClient()
        const { data } = await supabase
            .from("subscribers")
            .select("id, email, first_name, last_name, tags, status")
            .eq("id", subscriberId)
            .single()
        subscriber = data
    }

    return (
        <ChainLaunchChecks
            chain={chain}
            subscriber={subscriber}
        />
    )
}
