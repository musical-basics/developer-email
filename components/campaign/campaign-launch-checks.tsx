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
import { Music, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Campaign } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

import { Subscriber } from "@/lib/types"

interface CampaignLaunchChecksProps {
    campaign: Campaign
    audience: Audience
    targetSubscriber?: Subscriber | null
}

export function CampaignLaunchChecks({ campaign, audience, targetSubscriber }: CampaignLaunchChecksProps) {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
    // Default values since they are not in DB schema yet
    const [fromName, setFromName] = useState("Lionel Yu")
    const [fromEmail, setFromEmail] = useState("lionel@musicalbasics.com")
    const [broadcastStatus, setBroadcastStatus] = useState<"idle" | "success" | "error">("idle")
    const [broadcastMessage, setBroadcastMessage] = useState("")

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
        setBroadcastStatus("idle")
        setBroadcastMessage("")

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
            setBroadcastStatus("error")
            setBroadcastMessage(data.message || data.error || "Broadcast failed")

            toast({
                title: "Error sending broadcast",
                description: data.message || data.error,
                variant: "destructive"
            })
        } else {
            setBroadcastStatus("success")
            setBroadcastMessage(data.message)

            toast({
                title: "Campaign Sent!",
                description: data.message
            })
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <CampaignHeader campaign={campaign} />



                <div className="mt-6 grid gap-6 lg:grid-cols-5">
                    {/* Left Column - Controls */}
                    <div className="flex flex-col gap-6 lg:col-span-2">
                        <AudienceCard audience={audience} campaign={campaign} targetSubscriber={targetSubscriber} />
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

                        {broadcastStatus === "error" && (
                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Broadcast Failed</AlertTitle>
                                <AlertDescription>
                                    {broadcastMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        {broadcastStatus === "success" && (
                            <Alert className="border-green-500/50 bg-green-500/10 text-green-600 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertTitle>Success</AlertTitle>
                                <AlertDescription>
                                    {broadcastMessage}
                                </AlertDescription>
                            </Alert>
                        )}

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
