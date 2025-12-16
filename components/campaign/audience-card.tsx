"use client"

import { Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface Audience {
    total_subscribers: number
    active_subscribers: number
}

interface AudienceCardProps {
    audience: Audience
}

export function AudienceCard({ audience }: AudienceCardProps) {
    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <Users className="h-5 w-5 text-[#D4AF37]" />
                    Target Audience
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                        {audience.active_subscribers.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">Active Subscribers</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">All subscribers will receive this campaign when launched.</p>
            </CardContent>
        </Card>
    )
}
