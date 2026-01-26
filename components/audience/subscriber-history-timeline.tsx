"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
    Mail,
    MousePointer2,
    Eye,
    Globe,
    Clock,
    MoreHorizontal,
    ArrowUpRight
} from "lucide-react"
import { getSubscriberHistory } from "@/app/actions/subscriber-history"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimelineEvent {
    id: string
    type: 'sent' | 'open' | 'click' | 'page_view' | 'session_end'
    created_at: string
    url?: string
    ip_address?: string
    metadata?: { duration_seconds?: number }
    campaigns?: { name: string }
}

export function SubscriberHistoryTimeline({ subscriberId }: { subscriberId: string }) {
    const [events, setEvents] = useState<TimelineEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getSubscriberHistory(subscriberId).then((data) => {
            setEvents(data as any)
            setLoading(false)
        })
    }, [subscriberId])

    const getIcon = (type: string) => {
        switch (type) {
            case 'sent': return <Mail className="w-4 h-4 text-zinc-400" />
            case 'open': return <Eye className="w-4 h-4 text-amber-400" />
            case 'click': return <MousePointer2 className="w-4 h-4 text-emerald-400" />
            case 'page_view': return <Globe className="w-4 h-4 text-blue-400" />
            case 'session_end': return <Clock className="w-4 h-4 text-purple-400" />
            default: return <MoreHorizontal className="w-4 h-4 text-zinc-500" />
        }
    }

    const formatDuration = (seconds?: number) => {
        if (!seconds) return ""
        if (seconds < 60) return `${seconds}s`
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading history...</div>

    return (
        <Card className="h-full border-border bg-card">
            <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Activity Timeline
                </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[600px] p-0">
                <div className="p-6">
                    <div className="relative border-l border-border space-y-8">
                        {events.length === 0 ? (
                            <p className="pl-6 text-sm text-muted-foreground">No activity recorded yet.</p>
                        ) : (
                            events.map((event, index) => (
                                <div key={event.id} className="ml-4 relative">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center z-10">
                                        {/* Inner colored dot based on type */}
                                        <div className={`h-2 w-2 rounded-full ${event.type === 'open' ? 'bg-amber-500' :
                                                event.type === 'click' ? 'bg-emerald-500' :
                                                    event.type === 'page_view' ? 'bg-blue-500' :
                                                        'bg-zinc-600'
                                            }`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="p-1 rounded-md bg-muted/50 border border-border/50">
                                                {getIcon(event.type)}
                                            </span>
                                            <span className="text-sm font-medium text-foreground">
                                                {event.type === 'sent' && "Received Email"}
                                                {event.type === 'open' && "Opened Email"}
                                                {event.type === 'click' && "Clicked Link"}
                                                {event.type === 'page_view' && "Visited Website"}
                                                {event.type === 'session_end' && "Session Ended"}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                            </span>
                                        </div>

                                        {/* Details Box */}
                                        <div className="mt-1 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">

                                            {/* Campaign Context */}
                                            {event.campaigns?.name && (
                                                <div className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">
                                                    Campaign: {event.campaigns.name}
                                                </div>
                                            )}

                                            {/* Action Context */}
                                            {event.url && (
                                                <a href={event.url} target="_blank" className="flex items-center gap-1 text-blue-400 hover:underline break-all">
                                                    {new URL(event.url).pathname}
                                                    <ArrowUpRight className="w-3 h-3" />
                                                </a>
                                            )}

                                            {/* Metadata (Duration / IP) */}
                                            <div className="mt-2 flex gap-2">
                                                {event.metadata?.duration_seconds && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-purple-500/10 text-purple-400 border-purple-500/20">
                                                        Time on site: {formatDuration(event.metadata.duration_seconds)}
                                                    </Badge>
                                                )}
                                                {event.ip_address && (
                                                    <Badge variant="outline" className="text-[10px] h-5 text-zinc-500">
                                                        IP: {event.ip_address}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </ScrollArea>
        </Card>
    )
}
