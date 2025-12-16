"use client"

import { useState } from "react"
import { CampaignHeader } from "./campaign-header"
import { AudienceCard } from "./audience-card"
import { SenderIdentityCard } from "./sender-identity-card"
import { PreflightCheckCard } from "./preflight-check-card"
import { SendTestCard } from "./send-test-card"
import { LaunchpadCard } from "./launchpad-card"
import { EmailPreviewCard } from "./email-preview-card"
import { AnalyticsSection } from "./analytics-section"
import { BroadcastConfirmDialog } from "./broadcast-confirm-dialog"
import { Music } from "lucide-react"

export interface Campaign {
  id: string
  name: string
  subject_line: string
  status: "draft" | "scheduled" | "sent"
  html_content: string
  variable_values: Record<string, string>
  created_at: string
  updated_at: string
  from_name: string
  from_email: string
}

export interface Audience {
  total_subscribers: number
  active_subscribers: number
}

interface CampaignLaunchChecksProps {
  campaign: Campaign
  audience: Audience
}

export function CampaignLaunchChecks({ campaign, audience }: CampaignLaunchChecksProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [fromName, setFromName] = useState(campaign.from_name)
  const [fromEmail, setFromEmail] = useState(campaign.from_email)

  const handleLaunchClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmBroadcast = () => {
    console.log("Broadcasting to", audience.active_subscribers, "subscribers")
    setShowConfirmDialog(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <CampaignHeader campaign={campaign} />

        <div className="mt-8 flex items-center gap-3 text-lg font-medium text-foreground">
          <Music className="h-5 w-5 text-brand" />
          <span>{campaign.subject_line}</span>
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
              readOnly={campaign.status === "sent"}
            />
            <SendTestCard />
            <LaunchpadCard
              subscriberCount={audience.active_subscribers}
              onLaunch={handleLaunchClick}
              isDisabled={campaign.status === "sent"}
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
