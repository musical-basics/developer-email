import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { MetricsCards } from "@/components/metrics-cards"
import { QuickActions } from "@/components/quick-actions"
import { CampaignsTable } from "@/components/campaigns-table"

export default function HomePage() {
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
                        <CampaignsTable />
                    </section>
                </div>
            </main>
        </div>
    )
}
