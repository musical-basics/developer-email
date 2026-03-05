"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    GitBranch, Mail, Clock, ChevronDown, ChevronRight,
    User, Play, CalendarClock, ArrowRight, Loader2, Home,
    AlertCircle, CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { startChainProcess } from "@/app/actions/chain-processes"
import { ChainStepPreview } from "./chain-step-preview"
import type { ChainWithDetails, ChainStepWithCampaign } from "@/app/actions/chains"

interface ChainLaunchChecksProps {
    chain: ChainWithDetails
    subscriber: {
        id: string
        email: string
        first_name: string | null
        last_name: string | null
        tags: string[] | null
        status: string
    } | null
}

export function ChainLaunchChecks({ chain, subscriber }: ChainLaunchChecksProps) {
    const [expandedStep, setExpandedStep] = useState<number | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [launching, setLaunching] = useState(false)
    const [launchStatus, setLaunchStatus] = useState<"idle" | "success" | "error">("idle")
    const [launchMessage, setLaunchMessage] = useState("")
    const { toast } = useToast()
    const router = useRouter()

    const subscriberName = subscriber?.first_name
        ? `${subscriber.first_name} ${subscriber.last_name || ""}`.trim()
        : subscriber?.email || "Unknown"

    const toggleStep = (index: number) => {
        setExpandedStep(prev => prev === index ? null : index)
    }

    const handleStartNow = async () => {
        if (!subscriber) return
        setShowConfirmDialog(false)
        setLaunching(true)
        setLaunchStatus("idle")

        try {
            const result = await startChainProcess(subscriber.id, chain.id)
            if (!result.success) {
                throw new Error(result.error || "Failed to start chain")
            }

            setLaunchStatus("success")
            setLaunchMessage(`Chain "${chain.name}" is now running for ${subscriber.email}`)
            toast({
                title: "Chain Started!",
                description: `"${chain.name}" is now running for ${subscriber.email}`,
            })
        } catch (error: any) {
            setLaunchStatus("error")
            setLaunchMessage(error.message)
            toast({
                title: "Error starting chain",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setLaunching(false)
        }
    }

    // Compute total journey duration
    const totalDuration = chain.steps.reduce((acc, step) => {
        if (!step.wait_after) return acc
        const match = step.wait_after.match(/^(\d+)\s*(minutes?|hours?|days?|weeks?)$/i)
        if (!match) return acc
        const num = parseInt(match[1])
        const unit = match[2].toLowerCase()
        if (unit.startsWith("min")) return acc + num * 60
        if (unit.startsWith("hour")) return acc + num * 3600
        if (unit.startsWith("day")) return acc + num * 86400
        if (unit.startsWith("week")) return acc + num * 604800
        return acc
    }, 0)

    const formatDuration = (seconds: number) => {
        if (seconds === 0) return "Immediate"
        const weeks = Math.floor(seconds / 604800)
        const days = Math.floor((seconds % 604800) / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const parts = []
        if (weeks > 0) parts.push(`${weeks}w`)
        if (days > 0) parts.push(`${days}d`)
        if (hours > 0) parts.push(`${hours}h`)
        return parts.join(" ") || "< 1h"
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
                    <Link href="/journeys" className="hover:text-foreground transition-colors">
                        Journeys
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium truncate">{chain.name}</span>
                </nav>

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{chain.name}</h1>
                            <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
                                {chain.steps.length} email{chain.steps.length !== 1 ? "s" : ""}
                            </Badge>
                        </div>
                        {chain.description && (
                            <p className="text-muted-foreground mt-1">{chain.description}</p>
                        )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => toast({ title: "Scheduling coming soon", description: "Schedule feature will be available in a future update." })}
                            disabled={!subscriber || launchStatus === "success"}
                        >
                            <CalendarClock className="h-4 w-4 mr-2" />
                            Schedule
                        </Button>
                        <Button
                            onClick={() => setShowConfirmDialog(true)}
                            disabled={!subscriber || launching || launchStatus === "success"}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {launching ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Start Now
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Status Alerts */}
                {launchStatus === "success" && (
                    <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-emerald-400">Chain Started Successfully</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{launchMessage}</p>
                            <Button
                                variant="link"
                                size="sm"
                                className="text-emerald-400 px-0 mt-1 h-auto"
                                onClick={() => router.push("/journeys")}
                            >
                                View in Journeys →
                            </Button>
                        </div>
                    </div>
                )}

                {launchStatus === "error" && (
                    <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-400">Failed to Start Chain</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{launchMessage}</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Info */}
                    <div className="space-y-6">
                        {/* Target Subscriber */}
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <User className="h-4 w-4 text-[#D4AF37]" />
                                    Target Subscriber
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {subscriber ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-[#D4AF37]">
                                            {subscriberName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{subscriber.email}</p>
                                        {subscriber.tags && subscriber.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {subscriber.tags.slice(0, 4).map(tag => (
                                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {subscriber.tags.length > 4 && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        +{subscriber.tags.length - 4}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No subscriber selected.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Journey Overview */}
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <GitBranch className="h-4 w-4 text-[#D4AF37]" />
                                    Journey Overview
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {chain.steps.length} step{chain.steps.length !== 1 ? "s" : ""} · Total span: {formatDuration(totalDuration)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-0">
                                    {chain.steps.map((step, i) => (
                                        <div key={step.id || i}>
                                            {/* Step */}
                                            <div className="flex items-start gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold flex-shrink-0">
                                                        {i + 1}
                                                    </div>
                                                    {(i < chain.steps.length - 1) && (
                                                        <div className="w-px flex-1 min-h-[16px] bg-border" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-1 min-w-0">
                                                    <p className="text-xs font-medium text-foreground truncate">
                                                        {step.campaign_name || step.label}
                                                    </p>
                                                    {step.campaign_subject && (
                                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                            Subject: {step.campaign_subject}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Wait */}
                                            {step.wait_after && i < chain.steps.length - 1 && (
                                                <div className="flex items-start gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-px min-h-[4px] bg-border" />
                                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted flex-shrink-0">
                                                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                                        </div>
                                                        <div className="w-px min-h-[4px] bg-border" />
                                                    </div>
                                                    <div className="flex items-center h-5 mt-1">
                                                        <p className="text-[10px] text-amber-400/70 italic">
                                                            Wait {step.wait_after}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Steps Table */}
                    <div className="lg:col-span-2">
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                    <Mail className="h-4 w-4 text-[#D4AF37]" />
                                    Email Steps
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Click a step to preview the email content.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {chain.steps.map((step, i) => {
                                        const isExpanded = expandedStep === i
                                        return (
                                            <div key={step.id || i}>
                                                {/* Step Row */}
                                                <button
                                                    onClick={() => toggleStep(i)}
                                                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                                                >
                                                    {/* Step Number */}
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex-shrink-0">
                                                        {i + 1}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {step.campaign_name || step.label || "Untitled Step"}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {step.campaign_subject
                                                                ? <>Subject: <span className="text-foreground/70">{step.campaign_subject}</span></>
                                                                : <span className="italic">No subject line set</span>
                                                            }
                                                        </p>
                                                    </div>

                                                    {/* Wait Badge */}
                                                    {step.wait_after && (
                                                        <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/5 flex-shrink-0">
                                                            <Clock className="h-2.5 w-2.5 mr-1" />
                                                            {step.wait_after}
                                                        </Badge>
                                                    )}

                                                    {/* Chevron */}
                                                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                                                </button>

                                                {/* Expanded Preview (lazy) */}
                                                {isExpanded && (
                                                    <div className="px-6 pb-6 pt-2 bg-muted/10 border-t border-border/50">
                                                        <ChainStepPreview
                                                            htmlContent={step.campaign_html}
                                                            variableValues={step.campaign_variable_values}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {chain.steps.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Mail className="h-10 w-10 mb-3 opacity-30" />
                                        <p className="text-sm">No steps in this chain.</p>
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
                        <AlertDialogTitle>Start Chain &quot;{chain.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will immediately begin sending emails to{" "}
                            <span className="text-foreground font-medium">{subscriberName}</span>
                            {" "}({subscriber?.email}). {chain.steps.length} email{chain.steps.length !== 1 ? "s" : ""} will
                            be sent over a span of {formatDuration(totalDuration)}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleStartNow}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Start Chain
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
