"use client"

import { useEffect, useState, useTransition } from "react"
import { Flame, Clock, Target, ArrowRight, Loader2, Sparkles, MessageCircle, ExternalLink, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { getCRMLeads, type CRMLead } from "@/app/actions/crm"

export default function CRMPage() {
    const [leads, setLeads] = useState<CRMLead[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const fetchLeads = async () => {
        setLoading(true)
        const data = await getCRMLeads()
        setLeads(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchLeads()
    }, [])

    const handleRefresh = () => {
        startTransition(() => {
            fetchLeads()
        })
    }

    if (loading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="animate-spin h-8 w-8 text-amber-500" />
                <p className="text-sm text-muted-foreground">Loading CRM leads...</p>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Target className="text-amber-500" /> Sales CRM
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {leads.length > 0
                            ? `Your top ${leads.length} high-intent leads, ranked by engagement.`
                            : "No hot leads right now. Check back after your next campaign!"}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Score Legend */}
            <div className="flex items-center gap-6 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5 border border-border">
                <span className="font-medium text-foreground">Score Guide:</span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> 50+ Hot
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> 25-50 Warm
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-zinc-400" /> 15-25 Interested
                </span>
            </div>

            {/* Lead Cards */}
            <div className="grid gap-3">
                {leads.map((lead, index) => {
                    const isHot = lead.engagement_score > 50
                    const isWarm = lead.engagement_score > 25
                    const reasonTag = lead.tags?.find((t: string) => t.startsWith("Reason:"))
                    const visitedCheckout = lead.recent_pages?.some(
                        (p: string) => p.includes("customize") || p.includes("checkout") || p.includes("buy") || p.includes("reserve")
                    )

                    return (
                        <div
                            key={lead.id}
                            className={`bg-card border rounded-xl p-5 flex items-center gap-5 transition-colors ${isHot
                                    ? "border-red-500/30 hover:border-red-500/50"
                                    : isWarm
                                        ? "border-amber-500/20 hover:border-amber-500/40"
                                        : "hover:border-border/80"
                                }`}
                        >
                            {/* Rank */}
                            <div className="text-xs text-muted-foreground font-mono w-5 text-center shrink-0">
                                {index + 1}
                            </div>

                            {/* Score Badge */}
                            <div
                                className={`flex flex-col items-center rounded-lg min-w-[72px] p-2.5 border ${isHot
                                        ? "bg-red-500/10 border-red-500/20"
                                        : isWarm
                                            ? "bg-amber-500/10 border-amber-500/20"
                                            : "bg-muted/50 border-border"
                                    }`}
                            >
                                <Flame
                                    className={`w-4 h-4 ${isHot ? "text-red-500 animate-pulse" : isWarm ? "text-amber-500" : "text-zinc-400"
                                        }`}
                                />
                                <span className="text-xl font-bold mt-0.5">{lead.engagement_score}</span>
                            </div>

                            {/* Lead Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold truncate">
                                    {lead.first_name
                                        ? `${lead.first_name}${lead.last_name ? ` ${lead.last_name}` : ""}`
                                        : lead.email}
                                </h3>
                                {lead.first_name && (
                                    <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                                )}

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {lead.tags
                                        ?.filter((t: string) => !t.startsWith("Reason:"))
                                        .slice(0, 5)
                                        .map((tag: string) => (
                                            <Badge
                                                key={tag}
                                                variant="outline"
                                                className="bg-primary/5 text-primary text-[10px] py-0 px-1.5"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                </div>

                                {/* Objection / Reason tag */}
                                {reasonTag && (
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500 italic bg-amber-500/10 px-2.5 py-1 rounded w-fit border border-amber-500/20">
                                        <MessageCircle className="w-3 h-3 shrink-0" />
                                        <span className="truncate">
                                            &ldquo;{reasonTag.replace("Reason: ", "")}&rdquo;
                                        </span>
                                    </div>
                                )}

                                {/* Context: Last active + checkout flag */}
                                <div className="flex items-center gap-3 mt-2">
                                    {lead.last_seen_at && (
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(lead.last_seen_at), { addSuffix: true })}
                                        </div>
                                    )}
                                    {visitedCheckout && (
                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                            Visited Checkout
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-500 text-white border-none"
                                    disabled
                                    title="Coming soon — connect to JIT email drafting"
                                >
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    AI 1:1 Draft
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/audience/${lead.id}`)}
                                >
                                    View History
                                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {leads.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-16 border border-dashed rounded-xl">
                    <Target className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm">No hot leads detected.</p>
                    <p className="text-xs mt-1">Leads appear here when subscribers show high engagement (page views, clicks, conversions).</p>
                </div>
            )}
        </div>
    )
}
