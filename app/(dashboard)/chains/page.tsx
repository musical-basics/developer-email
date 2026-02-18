"use client"

import { useState, useEffect, useCallback } from "react"
import { CHAIN_TEMPLATES } from "@/lib/chains/templates"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    GitBranch, Mail, Clock, ChevronDown, ChevronUp,
    Zap, ArrowRight, Eye, MousePointer2, Ghost, GraduationCap,
    Plus, Pencil, Trash2, X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
    getChains, createChain, updateChain, deleteChain,
    type ChainRow, type ChainFormData
} from "@/app/actions/chains"

// ─── TYPES ─────────────────────────────────────────────────
interface StepForm { label: string; template_key: string; wait_after: string }
interface BranchForm { label: string; condition: string; action: string; description: string }

const emptyStep = (): StepForm => ({ label: "", template_key: "", wait_after: "" })
const emptyBranch = (): BranchForm => ({ label: "", condition: "", action: "", description: "" })

function chainRowToFormData(chain: ChainRow): ChainFormData {
    return {
        name: chain.name,
        slug: chain.slug,
        description: chain.description || "",
        trigger_label: chain.trigger_label || "",
        trigger_event: chain.trigger_event,
        steps: chain.chain_steps.map(s => ({
            position: s.position,
            label: s.label,
            template_key: s.template_key,
            wait_after: s.wait_after,
        })),
        branches: chain.chain_branches.map(b => ({
            description: b.description,
            position: b.position,
            label: b.label,
            condition: b.condition,
            action: b.action,
        })),
    }
}

// ─── CHAIN CARD ────────────────────────────────────────────
function ChainCard({
    chain,
    onEdit,
    onDelete
}: {
    chain: ChainRow
    onEdit: (chain: ChainRow) => void
    onDelete: (chain: ChainRow) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [previewIndex, setPreviewIndex] = useState<number | null>(null)

    const steps = chain.chain_steps || []
    const branches = chain.chain_branches || []
    const branchDescription = branches.length > 0 ? branches[0].description : ""

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
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => { e.stopPropagation(); onEdit(chain) }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => { e.stopPropagation(); onDelete(chain) }}
                            className="text-muted-foreground hover:text-red-400"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
                            {steps.length} email{steps.length !== 1 ? "s" : ""}
                            {branches.length > 0 ? " + branching" : ""}
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
                    <span>Trigger: <span className="text-foreground font-mono">{chain.trigger_event}</span></span>
                    <span className="text-border">•</span>
                    <span>{chain.trigger_label}</span>
                </div>
            </CardHeader>

            {expanded && (
                <CardContent className="pt-0 space-y-6">
                    {/* Steps Timeline */}
                    <div className="space-y-0">
                        {steps.map((step, i) => {
                            const template = CHAIN_TEMPLATES[step.template_key as keyof typeof CHAIN_TEMPLATES]
                            const isPreviewOpen = previewIndex === i

                            return (
                                <div key={step.id || i}>
                                    {/* Step */}
                                    <div className="flex items-start gap-4 group">
                                        {/* Timeline dot & line */}
                                        <div className="flex flex-col items-center">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            {(i < steps.length - 1 || branches.length > 0) && (
                                                <div className="w-px flex-1 min-h-[24px] bg-border" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                                                    {template && (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                {template.subject}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                {template && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPreviewIndex(isPreviewOpen ? null : i)
                                                        }}
                                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                                                    >
                                                        {isPreviewOpen ? "Hide Preview" : "Preview"}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Email Preview */}
                                            {isPreviewOpen && template && (
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
                                    {step.wait_after && (
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
                                                    Wait {step.wait_after}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Branching */}
                        {branches.length > 0 && (
                            <div className="flex items-start gap-4 mt-2">
                                <div className="flex flex-col items-center">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-500/50 bg-blue-500/10">
                                        <GitBranch className="h-4 w-4 text-blue-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground mb-3">
                                        {branchDescription}
                                    </p>
                                    <div className="space-y-2">
                                        {branches.map((branch, i) => {
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
                                                <div key={branch.id || i} className={`rounded-lg border p-3 ${borderColors[i] || borderColors[2]}`}>
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
                            {steps.map(step => {
                                const template = CHAIN_TEMPLATES[step.template_key as keyof typeof CHAIN_TEMPLATES]
                                if (!template) return null
                                return (
                                    <div key={step.id || step.template_key} className="flex items-center gap-2 text-xs">
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

// ─── CHAIN FORM DIALOG ─────────────────────────────────────
function ChainFormDialog({
    open,
    onOpenChange,
    editingChain,
    onSave,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingChain: ChainRow | null
    onSave: (data: ChainFormData, chainId?: string) => Promise<void>
}) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [description, setDescription] = useState("")
    const [triggerLabel, setTriggerLabel] = useState("")
    const [triggerEvent, setTriggerEvent] = useState("")
    const [steps, setSteps] = useState<StepForm[]>([emptyStep()])
    const [branches, setBranches] = useState<BranchForm[]>([])

    // Populate form when editing
    useEffect(() => {
        if (editingChain) {
            const fd = chainRowToFormData(editingChain)
            setName(fd.name)
            setSlug(fd.slug)
            setDescription(fd.description)
            setTriggerLabel(fd.trigger_label)
            setTriggerEvent(fd.trigger_event)
            setSteps(fd.steps.map(s => ({
                label: s.label,
                template_key: s.template_key,
                wait_after: s.wait_after || "",
            })))
            setBranches(fd.branches.map(b => ({
                label: b.label,
                condition: b.condition,
                action: b.action,
                description: b.description,
            })))
        } else {
            // Reset for "new" mode
            setName("")
            setSlug("")
            setDescription("")
            setTriggerLabel("")
            setTriggerEvent("")
            setSteps([emptyStep()])
            setBranches([])
        }
    }, [editingChain, open])

    // Auto-generate slug from name
    const handleNameChange = (val: string) => {
        setName(val)
        if (!editingChain) {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-chain")
        }
    }

    const updateStep = (index: number, field: keyof StepForm, value: string) => {
        setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
    }

    const updateBranch = (index: number, field: keyof BranchForm, value: string) => {
        setBranches(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
    }

    const handleSubmit = async () => {
        if (!name.trim() || !triggerEvent.trim()) return
        setLoading(true)
        try {
            const formData: ChainFormData = {
                name, slug, description, trigger_label: triggerLabel, trigger_event: triggerEvent,
                steps: steps.filter(s => s.label.trim() && s.template_key.trim()).map((s, i) => ({
                    position: i + 1, label: s.label, template_key: s.template_key,
                    wait_after: s.wait_after || null,
                })),
                branches: branches.filter(b => b.label.trim()).map((b, i) => ({
                    position: i + 1, label: b.label, condition: b.condition, action: b.action,
                    description: b.description,
                })),
            }
            await onSave(formData, editingChain?.id)
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    const templateKeys = Object.keys(CHAIN_TEMPLATES)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingChain ? "Edit Chain" : "New Email Chain"}</DialogTitle>
                    <DialogDescription>
                        {editingChain
                            ? "Update the chain configuration."
                            : "Configure a new automated email sequence."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Chain Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Chain Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="chain-name">Name</Label>
                                <Input id="chain-name" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g., Welcome Sequence" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="chain-slug">Slug</Label>
                                <Input id="chain-slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="welcome-sequence-chain" className="font-mono text-xs" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="chain-desc">Description</Label>
                            <Input id="chain-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What this chain does..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="chain-trigger-event">Trigger Event</Label>
                                <Input id="chain-trigger-event" value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)} placeholder="chain.welcome.start" className="font-mono text-xs" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="chain-trigger-label">Trigger Label</Label>
                                <Input id="chain-trigger-label" value={triggerLabel} onChange={e => setTriggerLabel(e.target.value)} placeholder="New subscriber signup" />
                            </div>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Steps</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSteps(prev => [...prev, emptyStep()])}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                            </Button>
                        </div>
                        {steps.map((step, i) => (
                            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                                    {steps.length > 1 && (
                                        <button onClick={() => setSteps(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input value={step.label} onChange={e => updateStep(i, "label", e.target.value)} placeholder="Step label" className="text-xs" />
                                    <Input
                                        value={step.template_key}
                                        onChange={e => updateStep(i, "template_key", e.target.value)}
                                        placeholder="Template key"
                                        className="font-mono text-xs"
                                        list="template-keys"
                                    />
                                    <Input value={step.wait_after} onChange={e => updateStep(i, "wait_after", e.target.value)} placeholder="Wait (e.g., 2 days)" className="text-xs" />
                                </div>
                            </div>
                        ))}
                        <datalist id="template-keys">
                            {templateKeys.map(k => <option key={k} value={k} />)}
                        </datalist>
                    </div>

                    {/* Branches */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Branches <span className="font-normal text-muted-foreground">(optional)</span></h3>
                            <Button variant="ghost" size="sm" onClick={() => setBranches(prev => [...prev, emptyBranch()])}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Branch
                            </Button>
                        </div>
                        {branches.length > 0 && (
                            <div className="space-y-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">Branch Description</Label>
                                    <Input
                                        value={branches[0]?.description || ""}
                                        onChange={e => {
                                            const desc = e.target.value
                                            setBranches(prev => prev.map(b => ({ ...b, description: desc })))
                                        }}
                                        placeholder="After N emails, checks engagement..."
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        )}
                        {branches.map((branch, i) => (
                            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Branch {i + 1}</span>
                                    <button onClick={() => setBranches(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input value={branch.label} onChange={e => updateBranch(i, "label", e.target.value)} placeholder="Label" className="text-xs" />
                                    <Input value={branch.condition} onChange={e => updateBranch(i, "condition", e.target.value)} placeholder="Condition" className="text-xs" />
                                    <Input value={branch.action} onChange={e => updateBranch(i, "action", e.target.value)} placeholder="Action" className="text-xs" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || !triggerEvent.trim() || loading}>
                        {loading ? "Saving..." : editingChain ? "Save Changes" : "Create Chain"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── MAIN PAGE ─────────────────────────────────────────────
export default function ChainsPage() {
    const [chains, setChains] = useState<ChainRow[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editingChain, setEditingChain] = useState<ChainRow | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<ChainRow | null>(null)
    const [deleting, setDeleting] = useState(false)
    const { toast } = useToast()

    const fetchChains = useCallback(async () => {
        const { data, error } = await getChains()
        if (error) {
            toast({ title: "Error", description: error, variant: "destructive" })
        } else {
            setChains(data || [])
        }
        setLoading(false)
    }, [toast])

    useEffect(() => { fetchChains() }, [fetchChains])

    const handleSave = async (formData: ChainFormData, chainId?: string) => {
        if (chainId) {
            const { error } = await updateChain(chainId, formData)
            if (error) {
                toast({ title: "Error updating chain", description: error, variant: "destructive" })
                return
            }
            toast({ title: "Chain updated", description: `"${formData.name}" has been updated.` })
        } else {
            const { error } = await createChain(formData)
            if (error) {
                toast({ title: "Error creating chain", description: error, variant: "destructive" })
                return
            }
            toast({ title: "Chain created", description: `"${formData.name}" has been created.` })
        }
        fetchChains()
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const { error } = await deleteChain(deleteTarget.id)
        if (error) {
            toast({ title: "Error deleting chain", description: error, variant: "destructive" })
        } else {
            toast({ title: "Chain deleted", description: `"${deleteTarget.name}" has been removed.` })
            fetchChains()
        }
        setDeleting(false)
        setDeleteTarget(null)
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Email Chains</h1>
                    <p className="text-muted-foreground">
                        Automated email sequences powered by Inngest. Each chain runs independently with built-in unsubscribe safety checks.
                    </p>
                </div>
                <Button onClick={() => { setEditingChain(null); setFormOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Chain
                </Button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading chains...</div>
                ) : chains.length === 0 ? (
                    <div className="text-center py-12">
                        <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">No chains yet. Create your first email chain to get started.</p>
                    </div>
                ) : (
                    chains.map(chain => (
                        <ChainCard
                            key={chain.id}
                            chain={chain}
                            onEdit={(c) => { setEditingChain(c); setFormOpen(true) }}
                            onDelete={(c) => setDeleteTarget(c)}
                        />
                    ))
                )}
            </div>

            {/* Create/Edit Dialog */}
            <ChainFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editingChain={editingChain}
                onSave={handleSave}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this chain and all its steps and branches. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {deleting ? "Deleting..." : "Delete Chain"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
