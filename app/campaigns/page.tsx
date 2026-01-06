import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { CampaignsTable } from "@/components/campaigns-table"
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog"
import { getCampaigns } from "@/app/actions/campaigns"

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
    const campaigns = await getCampaigns()

    return (
        <div className="min-h-screen bg-background">
            <AppSidebar />
            <main className="pl-64">
                <DashboardHeader />
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Campaigns</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage your email campaigns and newsletters.
                            </p>
                        </div>
                        <CreateCampaignDialog />
                    </div>

                    <div className="space-y-4">
                        <CampaignsTable
                            campaigns={campaigns}
                            loading={false}
                        // onRefresh is no longer needed as revalidatePath handles updates
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}
