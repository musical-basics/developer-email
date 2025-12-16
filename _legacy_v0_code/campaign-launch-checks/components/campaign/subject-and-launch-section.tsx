"use client"

import { Music, Users, Rocket } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Audience } from "./campaign-launch-checks"

interface SubjectAndLaunchSectionProps {
  subjectLine: string
  audience: Audience
  subscriberCount: number
  onLaunch: () => void
  isDisabled?: boolean
}

export function SubjectAndLaunchSection({
  subjectLine,
  audience,
  subscriberCount,
  onLaunch,
  isDisabled,
}: SubjectAndLaunchSectionProps) {
  return (
    <div className="space-y-4">
      {/* Subject Line - Full Width */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Subject Line
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 shrink-0 text-[#D4AF37]" />
            <span className="text-lg font-medium text-foreground">{subjectLine}</span>
          </div>
        </CardContent>
      </Card>

      {/* Two Column: Audience + Launchpad */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Target Audience */}
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <Users className="h-6 w-6 shrink-0 text-[#D4AF37]" />
            <div>
              <p className="text-base font-medium text-foreground">Target Audience</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{audience.active_subscribers.toLocaleString()}</span>{" "}
                Active Subscribers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Condensed Launchpad */}
        <Card className="border-2 border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Rocket className="h-6 w-6 shrink-0 text-[#D4AF37]" />
                <div>
                  <p className="text-base font-medium text-foreground">The Launchpad</p>
                  <p className="text-sm text-muted-foreground">Danger Zone — This action cannot be undone.</p>
                </div>
              </div>
              <Button
                onClick={onLaunch}
                disabled={isDisabled}
                className="shrink-0 gap-2 bg-[#D4AF37] text-[#050505] hover:bg-[#b8962e] disabled:opacity-50"
                size="sm"
              >
                <Rocket className="h-4 w-4" />
                Launch
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
