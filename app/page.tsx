"use client"
import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { MetricsCards } from "@/components/metrics-cards"
import { QuickActions } from "@/components/quick-actions"
import { CampaignsTable } from "@/components/campaigns-table"
import { createClient } from "@/lib/supabase/client"
import { Campaign } from "@/lib/types"

export default function HomePage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchCampaigns = async () => {
        setLoading(true) // Set loading to true before fetching
        const { data, error } = await supabase
            .from("campaigns")
            .select("*")
            .order("created_at", { ascending: false })

        if (data) setCampaigns(data)
        if (error) console.error("Error fetching campaigns:", error)

        setLoading(false)
    }

    useEffect(() => {
        fetchCampaigns()
    }, [supabase])

    return (
        <div className="min-h-screen bg-background">
            <AppSidebar />
            <main className="pl-64">
                <DashboardHeader />
                <div className="space-y-8 p-6">
                    {/* Metrics Section */}
                    <section>
                        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Overview</h2>
                        <MetricsCards />
                    </section>

                    {/* Quick Actions */}
                    <section>
                        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
                        <QuickActions />
                    </section>

                    {/* Recent Campaigns */}
                    <section>
                        <CampaignsTable campaigns={campaigns} loading={loading} onRefresh={fetchCampaigns} />
                    </section>
                </div>
            </main>
        </div>
    )
}
