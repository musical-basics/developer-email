"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { getChainRotation, getChainRotationAnalytics, enrollInChainRotation, updateChainRotation } from "@/app/actions/chain-rotations"
import { ArrowLeft, RefreshCw, Users, Eye, MousePointer2, GitBranch, Loader2, UserPlus, CheckCircle2, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function ChainRotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { toast } = useToast()

    const [rotation, setRotation] = useState<any>(null)
    const [analytics, setAnalytics] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [enrolling, setEnrolling] = useState(false)
    const [testSubscribers, setTestSubscribers] = useState<any[]>([])
    const [selectedSubIds, setSelectedSubIds] = useState<string[]>([])
    const [showEnrollPanel, setShowEnrollPanel] = useState(false)
    const [loadingSubs, setLoadingSubs] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [editName, setEditName] = useState("")

    const fetchData = async () => {
        setLoading(true)
        const [rotData, analyticsData] = await Promise.all([
            getChainRotation(id),
            getChainRotationAnalytics(id),
        ])
        setRotation(rotData)
        setAnalytics(analyticsData)
        if (rotData) setEditName(rotData.name)
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [id])

    const handleEnroll = async () => {
        if (selectedSubIds.length === 0) return
        setEnrolling(true)
        const result = await enrollInChainRotation(id, selectedSubIds)
        if (result.success) {
            const successCount = result.results?.filter((r: any) => r.success).length || 0
            toast({
                title: "Subscribers enrolled",
                description: `${successCount} subscriber(s) enrolled into chain rotation.`,
            })
            setSelectedSubIds([])
            setShowEnrollPanel(false)
            fetchData()
        } else {
            toast({ title: "Error", description: "Failed to enroll subscribers", variant: "destructive" })
        }
        setEnrolling(false)
    }

    const loadTestSubscribers = async () => {
        setLoadingSubs(true)
        const supabase = createClient()
        const { data } = await supabase
            .from("subscribers")
            .select("id, email, first_name, last_name, tags, status")
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(100)
        setTestSubscribers(data || [])
        setLoadingSubs(false)
    }

    const handleSaveName = async () => {
        if (!editName.trim() || !rotation) return
        await updateChainRotation(id, editName.trim(), rotation.chain_ids)
        setEditingName(false)
        fetchData()
        toast({ title: "Name updated" })
    }

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!rotation) {
        return (
            <div className="text-center py-24">
                <p className="text-muted-foreground">Chain rotation not found.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/chain-rotations")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chain Rotations
                </Button>
            </div>
        )
    }

    // Determine leader
    const maxOpens = Math.max(...analytics.map((a: any) => a.openRate), 0)
    const maxClicks = Math.max(...analytics.map((a: any) => a.clickRate), 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/chain-rotations")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    {editingName ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-xl font-bold h-10 max-w-sm"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false) }}
                            />
                            <Button size="sm" onClick={handleSaveName}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
                        </div>
                    ) : (
                        <h1
                            className="text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setEditingName(true)}
                            title="Click to edit name"
                        >
                            {rotation.name}
                        </h1>
                    )}
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {rotation.chains.length} chains · Cursor at position {(rotation.cursor_position || 0) + 1}
                    </p>
                </div>
                <Button
                    onClick={() => { setShowEnrollPanel(!showEnrollPanel); if (!showEnrollPanel) loadTestSubscribers() }}
                    className="gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Enroll Subscribers
                </Button>
            </div>

            {/* Chains in Rotation */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" /> Chains in Rotation
                </h2>
                <div className="grid gap-2">
                    {rotation.chains.map((chain: any, i: number) => {
                        const isNext = i === (rotation.cursor_position || 0) % rotation.chains.length
                        return (
                            <div
                                key={chain.id}
                                className={`rounded-lg border p-3 flex items-center justify-between ${isNext ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isNext ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                        }`}>
                                        {i + 1}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium">{chain.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {chain.chain_steps?.length || 0} steps
                                        </p>
                                    </div>
                                </div>
                                {isNext && (
                                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                        Next Up
                                    </Badge>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Analytics Comparison */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Performance Comparison
                </h2>
                {analytics.length === 0 || analytics.every((a: any) => a.enrolled === 0) ? (
                    <div className="text-center py-8 border border-dashed border-border rounded-xl">
                        <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No data yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Enroll subscribers to start collecting performance data.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {analytics.map((stat: any) => {
                            const isOpenLeader = stat.openRate === maxOpens && maxOpens > 0
                            const isClickLeader = stat.clickRate === maxClicks && maxClicks > 0
                            return (
                                <div
                                    key={stat.chainId}
                                    className="rounded-xl border border-border bg-card p-4 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <GitBranch className="h-4 w-4 text-primary" />
                                            <span className="font-semibold">{stat.chainName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {isOpenLeader && (
                                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Best Opens
                                                </Badge>
                                            )}
                                            {isClickLeader && (
                                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Best Clicks
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-foreground">{stat.enrolled}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Enrolled</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-foreground">{stat.sends}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sends</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-emerald-400">{stat.opens}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Opens</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-amber-400">{stat.clicks}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clicks</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-foreground">{stat.completed}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed</p>
                                        </div>
                                    </div>
                                    {/* Rate bars */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground w-16">Open Rate</span>
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stat.openRate}%` }} />
                                            </div>
                                            <span className="text-xs font-medium w-10 text-right">{stat.openRate}%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground w-16">Click Rate</span>
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${stat.clickRate}%` }} />
                                            </div>
                                            <span className="text-xs font-medium w-10 text-right">{stat.clickRate}%</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Enroll Subscribers Panel */}
            {showEnrollPanel && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">
                            <Users className="h-4 w-4" /> Enroll Subscribers
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowEnrollPanel(false)}>Close</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Each subscriber will be assigned to the next chain in the rotation (round-robin).
                    </p>
                    {loadingSubs ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                                {testSubscribers.map((sub) => {
                                    const isSelected = selectedSubIds.includes(sub.id)
                                    const isTestAccount = sub.tags?.some((t: string) => t.toLowerCase() === "test account")
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => {
                                                setSelectedSubIds(prev =>
                                                    prev.includes(sub.id) ? prev.filter(x => x !== sub.id) : [...prev, sub.id]
                                                )
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={isSelected ? "text-foreground font-medium" : "text-muted-foreground"}>
                                                    {sub.first_name || sub.email}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/60">{sub.email}</span>
                                                {isTestAccount && (
                                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                                        Test
                                                    </Badge>
                                                )}
                                            </div>
                                            {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-muted-foreground">
                                    {selectedSubIds.length} selected
                                </p>
                                <Button
                                    onClick={handleEnroll}
                                    disabled={enrolling || selectedSubIds.length === 0}
                                    className="gap-2"
                                >
                                    {enrolling ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling...</>
                                    ) : (
                                        <><UserPlus className="h-4 w-4" /> Enroll {selectedSubIds.length} Subscriber{selectedSubIds.length !== 1 ? "s" : ""}</>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
