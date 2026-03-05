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

        const templateKeys = chain.steps.map(s => s.template_key).filter(Boolean)

        const [subResult, directSentResult, copiesResult] = await Promise.all([
            supabase
                .from("subscribers")
                .select("id, email, first_name, last_name, tags, status")
                .eq("id", subscriberId)
                .single(),
            // Check sent_history for the exact template IDs
            supabase
                .from("sent_history")
                .select("campaign_id")
                .eq("subscriber_id", subscriberId)
                .in("campaign_id", templateKeys),
            // Find campaign copies (parent_template_id → template_key)
            supabase
                .from("campaigns")
                .select("id, parent_template_id")
                .in("parent_template_id", templateKeys),
        ])

        subscriber = subResult.data

        // Build set of template_keys that have been sent
        const sentTemplateKeys = new Set<string>()

        // Direct matches
        if (directSentResult.data) {
            directSentResult.data.forEach(r => sentTemplateKeys.add(r.campaign_id))
        }

        // Copy matches: check which copies appear in sent_history
        if (copiesResult.data && copiesResult.data.length > 0) {
            const copyIds = copiesResult.data.map(c => c.id)
            const { data: copySentRows } = await supabase
                .from("sent_history")
                .select("campaign_id")
                .eq("subscriber_id", subscriberId)
                .in("campaign_id", copyIds)

            if (copySentRows) {
                const copyToParent = new Map(copiesResult.data.map(c => [c.id, c.parent_template_id]))
                copySentRows.forEach(r => {
                    const parentId = copyToParent.get(r.campaign_id)
                    if (parentId) sentTemplateKeys.add(parentId)
                })
            }
        }

        alreadySentCampaignIds = [...sentTemplateKeys]
    }

    return (
        <ChainLaunchChecks
            chain={chain}
            subscriber={subscriber}
            alreadySentCampaignIds={alreadySentCampaignIds}
        />
    )
}
