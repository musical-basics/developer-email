"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    RefreshCw, Mail, ChevronDown, ChevronRight,
    Users, Play, Loader2, Home, AlertCircle, CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChainStepPreview } from "@/components/chain/chain-step-preview"
import { SendConsoleCard, type LogEntry } from "@/components/campaign/send-console-card"

type SubscriberInfo = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    tags: string[] | null
    status: string
}

type CampaignInfo = {
    id: string
    name: string
    subject_line: string
    html_content: string | null
    variable_values: Record<string, any> | null
}

interface RotationLaunchProps {
    rotation: {
        id: string
        name: string
        campaign_ids: string[]
        cursor_position: number
        campaigns: CampaignInfo[]
    }
    subscribers: SubscriberInfo[]
    assignments: { subscriberId: string; campaignId: string }[]
    campaignMap: Record<string, CampaignInfo>
}

export function RotationLaunch({ rotation, subscribers, assignments, campaignMap }: RotationLaunchProps) {
    const [selectedSubIdx, setSelectedSubIdx] = useState(0)
    const [showPreview, setShowPreview] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [sending, setSending] = useState(false)
    const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle")
    const [sendMessage, setSendMessage] = useState("")
    const [sendLogs, setSendLogs] = useState<LogEntry[]>([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [showConsole, setShowConsole] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    // Build subscriber → assignment lookup
    const assignmentMap = new Map(assignments.map(a => [a.subscriberId, a.campaignId]))

    const activeSubscriber = subscribers[selectedSubIdx]
    const activeCampaignId = assignmentMap.get(activeSubscriber?.id || "")
    const activeCampaign = activeCampaignId ? campaignMap[activeCampaignId] : null

    const getSubscriberName = (sub: SubscriberInfo | null) =>
        sub?.first_name
            ? `${sub.first_name} ${sub.last_name || ""}`.trim()
            : sub?.email || "Unknown"

    // Count how many subscribers are assigned to each campaign
    const campaignCounts: Record<string, number> = {}
    for (const a of assignments) {
        campaignCounts[a.campaignId] = (campaignCounts[a.campaignId] || 0) + 1
    }

    const handleSendAll = async () => {
        setShowConfirmDialog(false)
        setSending(true)
        setSendStatus("idle")
        setSendMessage("")
        setSendLogs([])
        setShowConsole(true)
        setIsStreaming(true)

        toast({ title: "Initiating rotation send...", description: "Watch the console for real-time progress." })

        try {
            const res = await fetch("/api/send-rotation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rotationId: rotation.id,
                    subscriberIds: subscribers.map(s => s.id),
                }),
            })

            if (!res.ok) {
                const errText = await res.text()
                setSendStatus("error")
                setSendMessage(errText || "Rotation send failed")
                setIsStreaming(false)
                toast({ title: "Rotation send failed", description: errText, variant: "destructive" })
                return
            }

            const reader = res.body?.getReader()
            if (!reader) {
                setIsStreaming(false)
                return
            }

            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const entry: LogEntry = JSON.parse(line)
                        setSendLogs(prev => [...prev, entry])

                        if (entry.done) {
                            setSendStatus("success")
                            setSendMessage(entry.message || "Rotation send complete")
                            toast({ title: "Rotation Send Complete!", description: entry.message })
                            router.refresh()
                        }
                    } catch {
                        // skip malformed lines
                    }
                }
            }

            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    const entry: LogEntry = JSON.parse(buffer)
                    setSendLogs(prev => [...prev, entry])
                    if (entry.done) {
                        setSendStatus("success")
                        setSendMessage(entry.message || "Rotation send complete")
                        router.refresh()
                    }
                } catch {
                    // skip
                }
            }

        } catch (error: any) {
            setSendStatus("error")
            setSendMessage(error.message)
            toast({
                title: "Rotation send failed",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setSending(false)
            setIsStreaming(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Link href="/" className="hover:text-foreground transition-colors">
                        <Home className="h-4 w-4" />
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <Link href="/audience" className="hover:text-foreground transition-colors">
                        Audience
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium truncate">Send via Rotation</span>
                </nav>

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <RefreshCw className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">{rotation.name}</h1>
                            <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
                                {rotation.campaigns.length} campaign{rotation.campaigns.length !== 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Round-robin distribution across {rotation.campaigns.length} campaigns. Review assignments below before sending.
                        </p>
                    </div>

                    <Button
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={sending || sendStatus === "success"}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white flex-shrink-0"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4 mr-2" />
                                Send All
                            </>
                        )}
                    </Button>
                </div>

                {/* Status Alerts */}
                {sendStatus === "success" && (
                    <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Rotation Send Complete</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{sendMessage}</p>
                            <Button
                                variant="link"
                                size="sm"
                                className="text-emerald-400 px-0 mt-1 h-auto"
                                onClick={() => router.push("/audience")}
                            >
                                Back to Audience →
                            </Button>
                        </div>
                    </div>
                )}

                {sendStatus === "error" && (
                    <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-400">Rotation Send Failed</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{sendMessage}</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Subscribers List */}
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <Users className="h-4 w-4 text-[#D4AF37]" />
                                    Subscribers
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Click a subscriber to preview their assigned email.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[260px]">
                                    <div className="divide-y divide-border">
                                        {subscribers.map((sub, idx) => {
                                            const campaignId = assignmentMap.get(sub.id)
                                            const campaign = campaignId ? campaignMap[campaignId] : null
                                            const isActive = idx === selectedSubIdx
                                            return (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => { setSelectedSubIdx(idx); setShowPreview(false) }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-[#D4AF37]/10 border-l-2 border-l-[#D4AF37]" : "hover:bg-muted/30 border-l-2 border-l-transparent"}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-medium truncate ${isActive ? "text-[#D4AF37]" : "text-foreground"}`}>
                                                            {getSubscriberName(sub)}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{sub.email}</p>
                                                    </div>
                                                    {campaign && (
                                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 flex-shrink-0 max-w-[120px] truncate">
                                                            {campaign.name}
                                                        </Badge>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Rotation Overview */}
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <RefreshCw className="h-4 w-4 text-[#D4AF37]" />
                                    Rotation Overview
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Distribution across campaigns starting at cursor position {rotation.cursor_position}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {rotation.campaigns.map((c, i) => {
                                        const count = campaignCounts[c.id] || 0
                                        const isCursorStart = i === rotation.cursor_position % rotation.campaigns.length
                                        return (
                                            <div
                                                key={c.id}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${isCursorStart
                                                    ? "bg-primary/10 border border-primary/20"
                                                    : "bg-muted/20"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`font-bold ${isCursorStart ? "text-primary" : "text-muted-foreground"}`}>
                                                        {i + 1}.
                                                    </span>
                                                    <span className={`truncate ${isCursorStart ? "text-primary font-medium" : "text-foreground"}`}>
                                                        {c.name}
                                                    </span>
                                                    {isCursorStart && (
                                                        <span className="text-[9px] text-primary/60">← start</span>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 flex-shrink-0">
                                                    {count} recipient{count !== 1 ? "s" : ""}
                                                </Badge>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Send Console */}
                        {showConsole && (
                            <SendConsoleCard logs={sendLogs} isStreaming={isStreaming} />
                        )}
                    </div>

                    {/* Right Column — Assigned Campaign Preview */}
                    <div className="lg:col-span-2">
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <Mail className="h-4 w-4 text-[#D4AF37]" />
                                    Assigned Email
                                    {activeSubscriber && (
                                        <span className="text-muted-foreground font-normal ml-1">
                                            for {getSubscriberName(activeSubscriber)}
                                        </span>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    This subscriber will receive this campaign via rotation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {activeCampaign ? (
                                    <div>
                                        {/* Campaign Row */}
                                        <button
                                            onClick={() => setShowPreview(prev => !prev)}
                                            className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                                        >
                                            {/* Step Number */}
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex-shrink-0">
                                                <Mail className="h-3.5 w-3.5" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {activeCampaign.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {activeCampaign.subject_line
                                                        ? <>Subject: <span className="text-foreground/70">{activeCampaign.subject_line}</span></>
                                                        : <span className="italic">No subject line set</span>
                                                    }
                                                </p>
                                            </div>

                                            {/* Chevron */}
                                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${showPreview ? "rotate-180" : ""}`} />
                                        </button>

                                        {/* Expanded Preview */}
                                        {showPreview && (
                                            <div className="px-6 pb-6 pt-2 bg-muted/10 border-t border-border/50">
                                                <ChainStepPreview
                                                    htmlContent={activeCampaign.html_content}
                                                    variableValues={activeCampaign.variable_values}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Mail className="h-10 w-10 mb-3 opacity-30" />
                                        <p className="text-sm">No campaign assigned.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Confirm Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send Rotation &quot;{rotation.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will immediately send emails to{" "}
                            <span className="text-foreground font-medium">{subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}</span>{" "}
                            distributed across{" "}
                            <span className="text-foreground font-medium">{rotation.campaigns.length} campaign{rotation.campaigns.length !== 1 ? "s" : ""}</span>.
                            <br />
                            <span className="text-muted-foreground/80 text-xs mt-2 block">
                                {rotation.campaigns.map(c => {
                                    const count = campaignCounts[c.id] || 0
                                    return `${c.name}: ${count}`
                                }).join(" · ")}
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSendAll}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Send All ({subscribers.length})
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
