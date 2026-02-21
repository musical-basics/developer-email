"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import {
    Mail,
    MousePointer2,
    Eye,
    Globe,
    Clock,
    MoreHorizontal,
    ArrowUpRight,
    Send,
    Link2
} from "lucide-react"
import { getSubscriberHistory, getSubscriberCampaigns, getSubscriberChains } from "@/app/actions/subscriber-history"
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

interface CampaignSend {
    campaign_id: string
    created_at: string
    campaigns: { id: string; name: string; status: string } | null
}

interface ChainProcess {
    id: string
    status: string
    current_step_index: number
    created_at: string
    updated_at: string
    email_chains: { id: string; name: string; slug: string } | null
}

export function SubscriberHistoryTimeline({ subscriberId }: { subscriberId: string }) {
    const [events, setEvents] = useState<TimelineEvent[]>([])
    const [campaigns, setCampaigns] = useState<CampaignSend[]>([])
    const [chains, setChains] = useState<ChainProcess[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            getSubscriberHistory(subscriberId),
            getSubscriberCampaigns(subscriberId),
            getSubscriberChains(subscriberId),
        ]).then(([historyData, campaignData, chainData]) => {
            setEvents(historyData as any)
            setCampaigns(campaignData as any)
            setChains(chainData as any)
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

    const chainStatusStyle: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
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
                        ) : (() => {
                            // Group consecutive identical events
                            type GroupedEvent = TimelineEvent & { count: number }
                            const grouped: GroupedEvent[] = []

                            for (const event of events) {
                                const prev = grouped[grouped.length - 1]
                                const sameType = prev && prev.type === event.type
                                const sameCampaign = prev?.campaigns?.name === event.campaigns?.name
                                const sameUrl = prev?.url === event.url

                                if (sameType && sameCampaign && sameUrl) {
                                    prev.count++
                                } else {
                                    grouped.push({ ...event, count: 1 })
                                }
                            }

                            const label = (type: string, count: number) => {
                                const names: Record<string, string> = {
                                    sent: "Received Email",
                                    open: "Opened Email",
                                    click: "Clicked Link",
                                    page_view: "Visited Website",
                                    session_end: "Session Ended",
                                }
                                const name = names[type] || type
                                return count > 1 ? `${name} (x${count})` : name
                            }

                            return grouped.map((event) => (
                                <div key={event.id} className="ml-4 relative">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center z-10">
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
                                                {label(event.type, event.count)}
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
                        })()}
                    </div>

                    {/* ─── Campaigns Sent ─── */}
                    <div className="mt-10 pt-6 border-t border-border">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                            <Send className="w-4 h-4 text-primary" />
                            Campaigns Received ({campaigns.length})
                        </h3>
                        {campaigns.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No campaigns sent to this subscriber yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {campaigns.map((c) => (
                                    <div key={c.campaign_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                                                <Mail className="w-3.5 h-3.5 text-blue-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/dashboard/${c.campaign_id}`}
                                                    className="text-sm font-medium text-foreground hover:underline truncate block"
                                                >
                                                    {c.campaigns?.name || "Unknown Campaign"}
                                                </Link>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Sent {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                        {c.campaigns?.status && (
                                            <Badge variant="outline" className="text-[10px] capitalize ml-2 flex-shrink-0">
                                                {c.campaigns.status}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ─── Chain Enrollments ─── */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                            <Link2 className="w-4 h-4 text-primary" />
                            Chain Enrollments ({chains.length})
                        </h3>
                        {chains.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Not enrolled in any chains.</p>
                        ) : (
                            <div className="space-y-2">
                                {chains.map((ch) => (
                                    <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 flex-shrink-0">
                                                <Link2 className="w-3.5 h-3.5 text-purple-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-sm font-medium text-foreground truncate block">
                                                    {ch.email_chains?.name || "Unknown Chain"}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Step {ch.current_step_index + 1} · Started {formatDistanceToNow(new Date(ch.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] capitalize ml-2 flex-shrink-0 ${chainStatusStyle[ch.status] || ""}`}
                                        >
                                            {ch.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </Card>
    )
}
