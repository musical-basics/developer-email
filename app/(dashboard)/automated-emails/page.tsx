import { CampaignsTabs } from "@/components/campaigns/campaigns-tabs"
import { CreateAutomatedDialog } from "@/components/campaigns/create-automated-dialog"
import { getCampaigns } from "@/app/actions/campaigns"

export const dynamic = "force-dynamic"

export default async function AutomatedEmailsPage() {
    const campaigns = await getCampaigns("automated")

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Automated Emails</h1>
                    <p className="text-muted-foreground mt-1">
                        Emails triggered automatically by subscriber actions (signups, tags, etc.).
                    </p>
                </div>
                <CreateAutomatedDialog />
            </div>

            <CampaignsTabs campaigns={campaigns} />
        </div>
    )
}
