"use client"

import { useState } from "react"
import { CHAIN_REGISTRY, ChainDefinition } from "@/lib/chains/registry"
import { CHAIN_TEMPLATES } from "@/lib/chains/templates"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    GitBranch, Mail, Clock, ChevronDown, ChevronUp,
    Zap, ArrowRight, Eye, MousePointer2, Ghost, GraduationCap
} from "lucide-react"

function ChainCard({ chain }: { chain: ChainDefinition }) {
    const [expanded, setExpanded] = useState(false)
    const [previewIndex, setPreviewIndex] = useState<number | null>(null)

    return (
        <Card className="border-border bg-card overflow-hidden">
            <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                            <GitBranch className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{chain.name}</CardTitle>
                            <CardDescription className="mt-1">{chain.description}</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
                            {chain.steps.length} email{chain.steps.length !== 1 ? "s" : ""}
                            {chain.branching ? " + branching" : ""}
                        </Badge>
                        {expanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" />
                    <span>Trigger: <span className="text-foreground font-mono">{chain.triggerEvent}</span></span>
                    <span className="text-border">•</span>
                    <span>{chain.trigger}</span>
                </div>
            </CardHeader>

            {expanded && (
                <CardContent className="pt-0 space-y-6">
                    {/* Steps Timeline */}
                    <div className="space-y-0">
                        {chain.steps.map((step, i) => {
                            const template = CHAIN_TEMPLATES[step.templateKey]
                            const isPreviewOpen = previewIndex === i

                            return (
                                <div key={step.templateKey}>
                                    {/* Step */}
                                    <div className="flex items-start gap-4 group">
                                        {/* Timeline dot & line */}
                                        <div className="flex flex-col items-center">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            {(i < chain.steps.length - 1 || chain.branching) && (
                                                <div className="w-px flex-1 min-h-[24px] bg-border" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {template.subject}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setPreviewIndex(isPreviewOpen ? null : i)
                                                    }}
                                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                                                >
                                                    {isPreviewOpen ? "Hide Preview" : "Preview"}
                                                </button>
                                            </div>

                                            {/* Email Preview */}
                                            {isPreviewOpen && (
                                                <div className="mt-3 rounded-lg border border-border bg-white p-4 text-sm">
                                                    <div
                                                        dangerouslySetInnerHTML={{
                                                            __html: template.generateHtml("Alex")
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Wait indicator */}
                                    {step.waitAfter && (
                                        <div className="flex items-start gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-px min-h-[8px] bg-border" />
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                                <div className="w-px min-h-[8px] bg-border" />
                                            </div>
                                            <div className="flex items-center h-6 mt-2">
                                                <p className="text-xs text-muted-foreground italic">
                                                    Wait {step.waitAfter}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Branching */}
                        {chain.branching && (
                            <div className="flex items-start gap-4 mt-2">
                                <div className="flex flex-col items-center">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-500/50 bg-blue-500/10">
                                        <GitBranch className="h-4 w-4 text-blue-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground mb-3">
                                        {chain.branching.description}
                                    </p>
                                    <div className="space-y-2">
                                        {chain.branching.branches.map((branch, i) => {
                                            const icons = [
                                                <MousePointer2 key="click" className="h-3.5 w-3.5 text-emerald-400" />,
                                                <Eye key="open" className="h-3.5 w-3.5 text-amber-400" />,
                                                <Ghost key="ghost" className="h-3.5 w-3.5 text-zinc-400" />,
                                            ]
                                            const borderColors = [
                                                "border-emerald-500/30 bg-emerald-500/5",
                                                "border-amber-500/30 bg-amber-500/5",
                                                "border-zinc-500/30 bg-zinc-500/5",
                                            ]
                                            return (
                                                <div key={i} className={`rounded-lg border p-3 ${borderColors[i] || borderColors[2]}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {icons[i] || icons[2]}
                                                        <span className="text-sm font-medium">{branch.label}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground ml-6">
                                                        <span className="text-foreground/70">If:</span> {branch.condition}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-6 mt-1">
                                                        <ArrowRight className="h-3 w-3" />
                                                        {branch.action}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Campaign IDs reference */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Tracking Campaign IDs
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {chain.steps.map(step => {
                                const template = CHAIN_TEMPLATES[step.templateKey]
                                return (
                                    <div key={step.templateKey} className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">{step.label}:</span>
                                        <code className="font-mono text-foreground/70 text-[10px]">
                                            {template.campaign_id}
                                        </code>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}

export default function ChainsPage() {
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Email Chains</h1>
                <p className="text-muted-foreground">
                    Automated email sequences powered by Inngest. Each chain runs independently with built-in unsubscribe safety checks.
                </p>
            </div>

            <div className="space-y-4">
                {CHAIN_REGISTRY.map(chain => (
                    <ChainCard key={chain.id} chain={chain} />
                ))}
            </div>
        </div>
    )
}
