import { Users, User, Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Campaign, Subscriber } from "@/lib/types"

export interface Audience {
    total_subscribers: number
    active_subscribers: number
}

interface AudienceCardProps {
    audience: Audience
    campaign?: Campaign
    targetSubscriber?: Subscriber | null
}

export function AudienceCard({ audience, campaign, targetSubscriber }: AudienceCardProps) {
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
                            {targetSubscriber ? (
                                <div className="text-sm text-blue-300 mt-1">
                                    <p className="font-medium">{targetSubscriber.first_name} {targetSubscriber.last_name}</p>
                                    <p className="opacity-80">{targetSubscriber.email}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Exclusive send to this individual.
                                </p>
                            )}
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
