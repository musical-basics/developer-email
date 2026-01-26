import { CampaignsTable } from "@/components/campaigns-table"
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

            <div className="space-y-8">
                {/* Drafts Section */}
                <CampaignsTable
                    title="Drafts"
                    campaigns={campaigns.filter(c => c.status === 'draft')}
                    loading={false}
                />

                {/* Sent Section */}
                <CampaignsTable
                    title="Sent Campaigns"
                    campaigns={campaigns.filter(c => ['sent', 'completed', 'active'].includes(c.status))}
                    loading={false}
                />
            </div>
        </div>
    )
}
