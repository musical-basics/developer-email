"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Brain, Check, X, Pencil, Clock, User, Loader2, Inbox } from "lucide-react"

interface JITDraft {
    id: string
    name: string
    subject_line: string
    html_content: string
    variable_values: {
        subscriber_id: string
        is_jit_draft: boolean
        trigger_context: string
        from_name?: string
        from_email?: string
    }
    created_at: string
}

interface Subscriber {
    id: string
    email: string
    first_name: string
    last_name: string
}

export default function ApprovalsPage() {
    const supabase = createClient()
    const router = useRouter()
    const { toast } = useToast()

    const [drafts, setDrafts] = useState<JITDraft[]>([])
    const [subscribers, setSubscribers] = useState<Record<string, Subscriber>>({})
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        fetchDrafts()
    }, [])

    const fetchDrafts = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("campaigns")
            .select("*")
            .eq("status", "draft")
            .not("variable_values->is_jit_draft", "is", null)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Failed to fetch JIT drafts:", error)
            setLoading(false)
            return
        }

        // Filter client-side for is_jit_draft === true
        const jitDrafts = (data || []).filter(
            (c: any) => c.variable_values?.is_jit_draft === true
        )
        setDrafts(jitDrafts)

        // Fetch subscriber details for each draft
        const subIds = [...new Set(jitDrafts.map((d: JITDraft) => d.variable_values.subscriber_id).filter(Boolean))]
        if (subIds.length > 0) {
            const { data: subs } = await supabase
                .from("subscribers")
                .select("id, email, first_name, last_name")
                .in("id", subIds)

            const subMap: Record<string, Subscriber> = {}
            for (const sub of subs || []) {
                subMap[sub.id] = sub
            }
            setSubscribers(subMap)
        }

        setLoading(false)
    }

    const handleDecision = async (campaignId: string, decision: "approved" | "rejected") => {
        setActionLoading(campaignId)
        try {
            const res = await fetch("/api/jit-decision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId, decision }),
            })

            const result = await res.json()
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" })
            } else {
                toast({
                    title: decision === "approved" ? "Approved & Sending" : "Rejected — Fallback Sent",
                    description: decision === "approved"
                        ? "The AI email is being sent now."
                        : "The standard template will be sent instead.",
                })
                // Remove from list
                setDrafts(prev => prev.filter(d => d.id !== campaignId))
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to process decision.", variant: "destructive" })
        }
        setActionLoading(null)
    }

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const mins = Math.floor(diff / (1000 * 60))
        if (hours > 0) return `${hours}h ago`
        if (mins > 0) return `${mins}m ago`
        return "just now"
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
                        <Brain className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">AI Approvals</h1>
                        <p className="text-sm text-muted-foreground">
                            Review AI-generated emails before they reach your subscribers
                        </p>
                    </div>
                    {drafts.length > 0 && (
                        <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full text-sm font-semibold text-violet-300">
                            {drafts.length} pending
                        </span>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && drafts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <Inbox className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">No pending drafts</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            When the AI generates a personalized email for a high-engagement subscriber,
                            it will appear here for your review.
                        </p>
                    </div>
                )}

                {/* Draft Cards */}
                <div className="space-y-4">
                    {drafts.map(draft => {
                        const sub = subscribers[draft.variable_values.subscriber_id]
                        const isProcessing = actionLoading === draft.id

                        return (
                            <div
                                key={draft.id}
                                className="bg-card border border-border rounded-lg overflow-hidden"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                            <User className="h-4 w-4 text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {sub ? `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || sub.email : "Unknown"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{sub?.email || draft.variable_values.subscriber_id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {timeAgo(draft.created_at)}
                                    </div>
                                </div>

                                {/* Trigger Context */}
                                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/10 border-b border-border">
                                    <span className="font-semibold text-violet-400">Trigger:</span>{" "}
                                    {draft.variable_values.trigger_context}
                                </div>

                                {/* Email Preview */}
                                <div className="p-4">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Subject: <span className="text-foreground">{draft.subject_line}</span></p>
                                    <div
                                        className="mt-3 p-4 bg-white/5 rounded-lg border border-border text-sm leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: draft.html_content }}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 p-4 border-t border-border bg-muted/20">
                                    <button
                                        onClick={() => handleDecision(draft.id, "approved")}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Approve & Send
                                    </button>
                                    <button
                                        onClick={() => handleDecision(draft.id, "rejected")}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => router.push(`/editor?id=${draft.id}`)}
                                        className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg transition-colors ml-auto"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Edit Draft
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
