"use client"

import { useState } from "react"
import { CampaignHeader } from "./campaign-header"
import { AudienceCard, Audience } from "./audience-card"
import { SenderIdentityCard } from "./sender-identity-card"
import { PreflightCheckCard } from "./preflight-check-card"
import { SendTestCard } from "./send-test-card"
import { LaunchpadCard } from "./launchpad-card"
import { EmailPreviewCard } from "./email-preview-card"
import { AnalyticsSection } from "./analytics-section"
import { BroadcastConfirmDialog } from "./broadcast-confirm-dialog"
import { Music } from "lucide-react"
import { Campaign } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface CampaignLaunchChecksProps {
    campaign: Campaign
    audience: Audience
}

export function CampaignLaunchChecks({ campaign, audience }: CampaignLaunchChecksProps) {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
    // Default values since they are not in DB schema yet
    const [fromName, setFromName] = useState("Lionel Yu")
    const [fromEmail, setFromEmail] = useState("lionel@musicalbasics.com")
    const { toast } = useToast()
    const router = useRouter()

    const handleLaunchClick = () => {
        setShowConfirmDialog(true)
    }

    const handleSendTest = async (email: string) => {
        const response = await fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "test",
                email,
                campaignId: campaign.id,
                fromName,
                fromEmail
            })
        })

        const data = await response.json()

        if (!response.ok) {
            toast({
                title: "Error sending test email",
                description: data.error,
                variant: "destructive"
            })
            throw new Error(data.error)
        } else {
            toast({
                title: "Test email sent",
                description: `Sent to ${email}`
            })
        }
    }

    const handleConfirmBroadcast = async () => {
        setShowConfirmDialog(false)

        // Optimistic UI update or loading state could be added here
        toast({ title: "Initiating broadcast...", description: "This may take a moment." })

        const response = await fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "broadcast",
                campaignId: campaign.id,
                fromName,
                fromEmail
            })
        })

        const data = await response.json()

        if (!response.ok) {
            toast({
                title: "Error sending broadcast",
                description: data.error,
                variant: "destructive"
            })
        } else {
            toast({
                title: "Campaign Sent!",
                description: `Successfully sent to ${data.count} subscribers.`
            })
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <CampaignHeader campaign={campaign} />

                <div className="mt-8 flex items-center gap-3 text-lg font-medium text-foreground">
                    <Music className="h-5 w-5 text-brand" />
                    <span>{campaign.subject_line || "(No Subject)"}</span>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-5">
                    {/* Left Column - Controls */}
                    <div className="flex flex-col gap-6 lg:col-span-2">
                        <AudienceCard audience={audience} />
                        <SenderIdentityCard
                            fromName={fromName}
                            fromEmail={fromEmail}
                            onFromNameChange={setFromName}
                            onFromEmailChange={setFromEmail}
                            readOnly={campaign.status === "completed"}
                        />
                        <SendTestCard onSendTest={handleSendTest} />
                        <LaunchpadCard
                            subscriberCount={audience.active_subscribers}
                            onLaunch={handleLaunchClick}
                            isDisabled={campaign.status === "completed"}
                        />
                        <PreflightCheckCard
                            subjectLine={campaign.subject_line}
                            htmlContent={campaign.html_content}
                            variableValues={campaign.variable_values}
                        />
                    </div>

                    {/* Right Column - Preview */}
                    <div className="lg:col-span-3">
                        <EmailPreviewCard campaign={campaign} previewMode={previewMode} onPreviewModeChange={setPreviewMode} />
                    </div>
                </div>

                {/* Analytics Section */}
                <div className="mt-8">
                    <AnalyticsSection status={campaign.status} />
                </div>
            </div>

            {/* Confirmation Dialog */}
            <BroadcastConfirmDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                subscriberCount={audience.active_subscribers}
                campaignName={campaign.name}
                subjectLine={campaign.subject_line}
                onConfirm={handleConfirmBroadcast}
            />
        </div>
    )
}
