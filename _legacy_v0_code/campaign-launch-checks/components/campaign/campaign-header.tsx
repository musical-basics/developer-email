"use client"

import Link from "next/link"
import { ChevronRight, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Campaign } from "./campaign-launch-checks"

interface CampaignHeaderProps {
  campaign: Campaign
}

const statusConfig = {
  draft: { label: "Draft", className: "bg-zinc-700 text-zinc-300 hover:bg-zinc-700" },
  scheduled: { label: "Scheduled", className: "bg-amber-900/50 text-amber-400 hover:bg-amber-900/50" },
  sent: { label: "Sent", className: "bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/50" },
}

export function CampaignHeader({ campaign }: CampaignHeaderProps) {
  const status = statusConfig[campaign.status]

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/campaigns" className="transition-colors hover:text-foreground">
          Campaigns
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{campaign.name}</span>
      </nav>

      {/* Title Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{campaign.name}</h1>
          <Badge variant="secondary" className={status.className}>
            {status.label}
          </Badge>
        </div>

        <Button variant="outline" className="w-fit gap-2 border-border hover:bg-secondary bg-transparent">
          <Pencil className="h-4 w-4" />
          Edit Design
        </Button>
      </div>

      {/* Subject Line Preview */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subject Line</p>
        <p className="mt-1 text-foreground">{campaign.subject_line}</p>
      </div>
    </div>
  )
}
