import { CampaignsTabs } from "@/components/campaigns/campaigns-tabs"
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog"
import { getCampaigns } from "@/app/actions/campaigns"

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
    const campaigns = await getCampaigns()

    return (
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

            <CampaignsTabs campaigns={campaigns} />
        </div>
    )
}
