import { Users, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Campaign } from "@/lib/types"

export interface Audience {
    total_subscribers: number
    active_subscribers: number
}

interface AudienceCardProps {
    audience: Audience
    campaign?: Campaign
}

export function AudienceCard({ audience, campaign }: AudienceCardProps) {
    const lockedSubscriberId = campaign?.variable_values?.subscriber_id

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <Users className="h-5 w-5 text-[#D4AF37]" />
                    Target Audience
                </CardTitle>
            </CardHeader>
            <CardContent>
                {lockedSubscriberId ? (
                    <div className="flex items-center gap-4 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                        <User className="h-8 w-8 text-blue-400" />
                        <div>
                            <p className="font-bold text-lg text-blue-400">1 Subscriber</p>
                            <p className="text-sm text-muted-foreground">
                                Exclusive send to this individual.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tracking-tight text-foreground">
                                {audience.active_subscribers.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">Active Subscribers</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">All subscribers will receive this campaign when launched.</p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
