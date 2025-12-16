"use client"

import { Rocket, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface LaunchpadCardProps {
    subscriberCount: number
    onLaunch: () => void
    isDisabled?: boolean
}

export function LaunchpadCard({ subscriberCount, onLaunch, isDisabled }: LaunchpadCardProps) {
    return (
        <Card className="border-2 border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/5 to-transparent">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <Rocket className="h-5 w-5 text-[#D4AF37]" />
                    The Launchpad
                </CardTitle>
                <CardDescription className="text-muted-foreground">Danger Zone — This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <p className="text-sm text-muted-foreground">
                        You are about to send this campaign to{" "}
                        <span className="font-semibold text-foreground">{subscriberCount.toLocaleString()} subscribers</span>.
                        Please review everything before launching.
                    </p>
                </div>

                <Button
                    onClick={onLaunch}
                    disabled={isDisabled}
                    className="w-full gap-2 bg-[#D4AF37] text-[#050505] hover:bg-[#b8962e] disabled:opacity-50"
                    size="lg"
                >
                    <Rocket className="h-5 w-5" />
                    Send Broadcast to All Subscribers
                </Button>

                {isDisabled && (
                    <p className="text-center text-sm text-muted-foreground">This campaign has already been sent.</p>
                )}
            </CardContent>
        </Card>
    )
}
