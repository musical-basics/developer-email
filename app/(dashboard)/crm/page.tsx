"use client"

import { useEffect, useState, useTransition, useCallback } from "react"
import { Flame, Clock, Target, ArrowRight, Loader2, Sparkles, MessageCircle, RefreshCw, Settings2, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { getCRMLeads } from "@/app/actions/crm"
import { type CRMLead, type CRMScoringConfig, DEFAULT_CRM_CONFIG } from "@/lib/crm-types"
import { CRMConfigPanel, getActiveConfig } from "@/components/crm/crm-config-panel"
import { SendCampaignModal } from "@/components/audience/send-campaign-modal"
import { getCampaignList, getRecentlyUsedTemplateIds, duplicateCampaignForSubscriber } from "@/app/actions/campaigns"
import { type Campaign, type Subscriber } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

type Tab = "leads" | "config"
const CRM_CACHE_KEY = "dp_crm_leads_cache"

function getCacheKey(config: CRMScoringConfig): string {
    // Simple hash based on config values that affect results
    return `${config.min_score}_${config.max_score}_${config.event_lookback_days}_${config.exclude_tags.join(",")}`
}

function getCachedLeads(config: CRMScoringConfig): CRMLead[] | null {
    try {
        const raw = sessionStorage.getItem(CRM_CACHE_KEY)
        if (!raw) return null
        const cached = JSON.parse(raw)
        if (cached.key === getCacheKey(config)) return cached.leads
        return null
    } catch { return null }
}

function setCachedLeads(config: CRMScoringConfig, leads: CRMLead[]) {
    try {
        sessionStorage.setItem(CRM_CACHE_KEY, JSON.stringify({
            key: getCacheKey(config),
            leads,
        }))
    } catch { /* ignore quota errors */ }
}

export default function CRMPage() {
    const [leads, setLeads] = useState<CRMLead[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<Tab>("leads")
    const [activeConfig, setActiveConfig] = useState<CRMScoringConfig>(DEFAULT_CRM_CONFIG)
    const router = useRouter()
    const { toast } = useToast()

    // Send Campaign Modal state
    const [isSelectCampaignOpen, setIsSelectCampaignOpen] = useState(false)
    const [targetSubscriber, setTargetSubscriber] = useState<Subscriber | null>(null)
    const [existingCampaigns, setExistingCampaigns] = useState<Campaign[]>([])
    const [loadingCampaigns, setLoadingCampaigns] = useState(false)
    const [duplicating, setDuplicating] = useState(false)
    const [recentlyUsedIds, setRecentlyUsedIds] = useState<string[]>([])

    const fetchLeads = useCallback(async (config?: CRMScoringConfig, skipCache = false) => {
        const cfg = config || activeConfig

        // Check sessionStorage cache first (instant restore on back-nav)
        if (!skipCache) {
            const cached = getCachedLeads(cfg)
            if (cached) {
                setLeads(cached)
                setLoading(false)
                return
            }
        }

        setLoading(true)
        const data = await getCRMLeads(cfg)
        setLeads(data)
        setCachedLeads(cfg, data)
        setLoading(false)
    }, [activeConfig])

    useEffect(() => {
        // Load saved config from localStorage
        const saved = getActiveConfig()
        setActiveConfig(saved)
        fetchLeads(saved)
    }, [])

    const handleRefresh = () => {
        startTransition(() => { fetchLeads(undefined, true) })
    }

    const handleConfigChange = (newConfig: CRMScoringConfig) => {
        setActiveConfig(newConfig)
        setActiveTab("leads")
        fetchLeads(newConfig, true) // always refetch on config change
    }

    // --- Send Existing Campaign ---
    const handleOpenSelectCampaign = async (lead: CRMLead) => {
        // Convert CRMLead to a minimal Subscriber shape for the modal
        setTargetSubscriber({
            id: lead.id,
            email: lead.email,
            first_name: lead.first_name || "",
            last_name: lead.last_name || "",
            country: "", country_code: "", phone_code: "", phone_number: "",
            shipping_address1: "", shipping_address2: "", shipping_city: "",
            shipping_zip: "", shipping_province: "",
            tags: lead.tags || null,
            status: "active",
            created_at: "",
        } as Subscriber)
        setIsSelectCampaignOpen(true)
        setLoadingCampaigns(true)

        try {
            const [campaigns, recentIds] = await Promise.all([
                getCampaignList(),
                getRecentlyUsedTemplateIds(),
            ])
            setExistingCampaigns((campaigns as Campaign[]).filter(c => c.is_template === true))
            setRecentlyUsedIds(recentIds)
        } catch (error) {
            console.error("Failed to load campaigns", error)
            toast({ title: "Error loading campaigns", variant: "destructive" })
        } finally {
            setLoadingCampaigns(false)
        }
    }

    const handleSelectCampaign = async (campaign: Campaign) => {
        if (!targetSubscriber) return

        setDuplicating(true)
        try {
            const name = targetSubscriber.first_name
                ? `${targetSubscriber.first_name} ${targetSubscriber.last_name || ''}`.trim()
                : targetSubscriber.email

            const result = await duplicateCampaignForSubscriber(campaign.id, targetSubscriber.id, name)

            if (result.error) {
                throw new Error(result.error)
            }

            toast({
                title: "Campaign Duplicated",
                description: `Created copy of "${campaign.name}" for ${targetSubscriber.email}. Redirecting...`,
            })

            if (result.data?.id) {
                router.push(`/dashboard/${result.data.id}`)
            }
            setIsSelectCampaignOpen(false)
        } catch (error: any) {
            toast({
                title: "Error duplicating campaign",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setDuplicating(false)
        }
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
                        {activeTab === "leads"
                            ? leads.length > 0
                                ? `${leads.length} leads matching your scoring config.`
                                : loading ? "Loading..." : "No leads match current config."
                            : "Configure scoring weights, presets, and filters."}
                    </p>
                </div>
                {activeTab === "leads" && (
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending || loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isPending || loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                <button
                    onClick={() => setActiveTab("leads")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "leads"
                        ? "border-amber-500 text-amber-500"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Target className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                    Leads
                    {leads.length > 0 && (
                        <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                            {leads.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("config")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "config"
                        ? "border-amber-500 text-amber-500"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Settings2 className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                    Config
                </button>
            </div>

            {/* Config Tab */}
            {activeTab === "config" && (
                <CRMConfigPanel onConfigChange={handleConfigChange} />
            )}

            {/* Leads Tab */}
            {activeTab === "leads" && (
                <>
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
                            <span className="h-2 w-2 rounded-full bg-zinc-400" /> &lt;25 Interested
                        </span>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="p-10 flex flex-col items-center justify-center min-h-[300px] gap-3">
                            <Loader2 className="animate-spin h-8 w-8 text-amber-500" />
                            <p className="text-sm text-muted-foreground">Scoring leads...</p>
                        </div>
                    )}

                    {/* Lead Cards */}
                    {!loading && (
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

                                            {/* Context */}
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
                                                onClick={() => handleOpenSelectCampaign(lead)}
                                            >
                                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                                Send Campaign
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
                    )}

                    {leads.length === 0 && !loading && (
                        <div className="text-center text-muted-foreground py-16 border border-dashed rounded-xl">
                            <Target className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-sm">No leads match your current scoring config.</p>
                            <p className="text-xs mt-1">Try lowering the minimum score in the Config tab.</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab("config")}>
                                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                                Open Config
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Send Campaign Modal */}
            <SendCampaignModal
                open={isSelectCampaignOpen}
                onOpenChange={setIsSelectCampaignOpen}
                campaigns={existingCampaigns}
                loading={loadingCampaigns}
                bulkSendMode={false}
                selectedIds={[]}
                targetSubscriber={targetSubscriber}
                recentlyUsedIds={recentlyUsedIds}
                onSelectCampaign={handleSelectCampaign}
                duplicating={duplicating}
            />
        </div>
    )
}
