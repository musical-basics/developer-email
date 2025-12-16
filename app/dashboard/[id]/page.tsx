import { CampaignLaunchChecks } from "@/components/campaign/campaign-launch-checks"
import { createClient } from "@/lib/supabase/server"
import { Campaign } from "@/lib/types"
import { notFound } from "next/navigation"

interface DashboardPageProps {
    params: Promise<{ id: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch Campaign
    const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single()

    if (campaignError || !campaign) {
        notFound()
    }

    // Fetch Subscriber Count
    // In a real app we might want to filter by tags etc. For now we fetch all active.
    const { count, error: countError } = await supabase
        .from("subscribers")
        .select("*", { count: 'exact', head: true })
        .eq("status", "active")

    const audience = {
        total_subscribers: count || 0,
        active_subscribers: count || 0
    }

    return (
        <CampaignLaunchChecks
            campaign={campaign as Campaign}
            audience={audience}
        />
    )
}
