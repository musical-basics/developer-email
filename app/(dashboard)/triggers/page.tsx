"use client"

import { useEffect, useState } from "react"
import { Zap, Plus, Trash2, Power, Loader2, TicketPercent, Mail, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { getTriggers, createTrigger, updateTrigger, deleteTrigger, type EmailTrigger } from "@/app/actions/triggers"
import { createClient } from "@/lib/supabase/client"

interface CampaignOption {
    id: string
    name: string
}

export default function TriggersPage() {
    const [triggers, setTriggers] = useState<EmailTrigger[]>([])
    const [automatedEmails, setAutomatedEmails] = useState<CampaignOption[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [showCreate, setShowCreate] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const { toast } = useToast()

    // New trigger form
    const [newName, setNewName] = useState("")
    const [newTriggerValue, setNewTriggerValue] = useState("")
    const [newCampaignId, setNewCampaignId] = useState("")
    const [newGenerateDiscount, setNewGenerateDiscount] = useState(false)
    const [newDiscountType, setNewDiscountType] = useState<"fixed_amount" | "percentage">("fixed_amount")
    const [newDiscountValue, setNewDiscountValue] = useState(300)
    const [newDiscountDays, setNewDiscountDays] = useState(30)
    const [newDiscountPrefix, setNewDiscountPrefix] = useState("SAVE300")
    const [newDiscountLimit, setNewDiscountLimit] = useState(1)

    const loadData = async () => {
        setLoading(true)
        const [triggerData] = await Promise.all([getTriggers()])

        // Fetch automated emails for dropdown
        const supabase = createClient()
        const { data: campaigns } = await supabase
            .from("campaigns")
            .select("id, name")
            .eq("email_type", "automated")
            .order("name")

        setTriggers(triggerData)
        setAutomatedEmails(campaigns || [])
        setLoading(false)
    }

    useEffect(() => { loadData() }, [])

    const handleCreate = async () => {
        if (!newName.trim() || !newTriggerValue.trim()) {
            toast({ title: "Missing fields", description: "Name and trigger tag are required.", variant: "destructive" })
            return
        }
        setSaving("new")
        try {
            await createTrigger({
                name: newName.trim(),
                trigger_type: "subscriber_tag",
                trigger_value: newTriggerValue.trim(),
                action_type: "send_automated_email",
                campaign_id: newCampaignId || null,
                generate_discount: newGenerateDiscount,
                discount_config: newGenerateDiscount ? {
                    type: newDiscountType,
                    value: newDiscountValue,
                    durationDays: newDiscountDays,
                    codePrefix: newDiscountPrefix,
                    usageLimit: newDiscountLimit,
                } : null,
                is_active: true,
            })
            toast({ title: "Trigger created", description: `"${newName}" is now active.` })
            setShowCreate(false)
            setNewName("")
            setNewTriggerValue("")
            setNewCampaignId("")
            setNewGenerateDiscount(false)
            await loadData()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        }
        setSaving(null)
    }

    const handleToggle = async (trigger: EmailTrigger) => {
        setSaving(trigger.id)
        try {
            await updateTrigger(trigger.id, { is_active: !trigger.is_active })
            await loadData()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        }
        setSaving(null)
    }

    const handleUpdateCampaign = async (triggerId: string, campaignId: string) => {
        setSaving(triggerId)
        try {
            await updateTrigger(triggerId, { campaign_id: campaignId || null })
            await loadData()
            toast({ title: "Updated", description: "Linked automated email updated." })
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        }
        setSaving(null)
    }

    const handleDelete = async (trigger: EmailTrigger) => {
        if (!confirm(`Delete trigger "${trigger.name}"?`)) return
        setDeleting(trigger.id)
        try {
            await deleteTrigger(trigger.id)
            toast({ title: "Deleted", description: `"${trigger.name}" has been removed.` })
            await loadData()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        }
        setDeleting(null)
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading triggers...
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Triggers</h1>
                    <p className="text-muted-foreground mt-1">
                        Connect incoming events to automated email sends.
                    </p>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Trigger
                </Button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="border border-border rounded-lg p-6 bg-card space-y-4">
                    <h3 className="font-semibold text-foreground">Create New Trigger</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Trigger Name</Label>
                            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., $300 Off Discount Email" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">When subscriber tagged with</Label>
                            <Input value={newTriggerValue} onChange={e => setNewTriggerValue(e.target.value)} placeholder="e.g., $300 Off Lead" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Then send this automated email</Label>
                        <select
                            value={newCampaignId}
                            onChange={e => setNewCampaignId(e.target.value)}
                            className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="">— No email linked yet —</option>
                            {automatedEmails.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {automatedEmails.length === 0 && (
                            <p className="text-xs text-amber-400 mt-1">No automated emails found. Create one first from the Automated Emails page.</p>
                        )}
                    </div>

                    {/* Discount Toggle */}
                    <div className="border-t border-border pt-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Switch checked={newGenerateDiscount} onCheckedChange={setNewGenerateDiscount} />
                            <Label className="text-sm font-medium cursor-pointer" onClick={() => setNewGenerateDiscount(!newGenerateDiscount)}>
                                Generate Shopify discount code
                            </Label>
                        </div>
                        {newGenerateDiscount && (
                            <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-primary/20 ml-1">
                                <div className="space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <select value={newDiscountType} onChange={e => setNewDiscountType(e.target.value as any)} className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm">
                                        <option value="fixed_amount">Fixed Amount ($)</option>
                                        <option value="percentage">Percentage (%)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Value</Label>
                                    <Input type="number" value={newDiscountValue} onChange={e => setNewDiscountValue(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Code Prefix</Label>
                                    <Input value={newDiscountPrefix} onChange={e => setNewDiscountPrefix(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Valid Days</Label>
                                    <Input type="number" value={newDiscountDays} onChange={e => setNewDiscountDays(Number(e.target.value))} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button onClick={handleCreate} disabled={saving === "new"}>
                            {saving === "new" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</> : "Create Trigger"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                    </div>
                </div>
            )}

            {/* Trigger List */}
            {triggers.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-12 text-center">
                    <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No triggers configured yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Create one to automatically send emails when subscribers are tagged.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {triggers.map(trigger => {
                        const isExpanded = expandedId === trigger.id
                        return (
                            <div key={trigger.id} className={`border rounded-lg transition-colors ${trigger.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-70"}`}>
                                {/* Main Row */}
                                <div className="p-4 flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${trigger.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-foreground truncate">{trigger.name}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{trigger.trigger_value}</span>
                                            <span>→</span>
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3 h-3" />
                                                {trigger.campaign_name || <span className="italic text-amber-400">No email linked</span>}
                                            </span>
                                            {trigger.generate_discount && (
                                                <span className="flex items-center gap-1 text-violet-400">
                                                    <TicketPercent className="w-3 h-3" />
                                                    {trigger.discount_config?.type === "percentage"
                                                        ? `${trigger.discount_config.value}% off`
                                                        : `$${trigger.discount_config?.value} off`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : trigger.id)}
                                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleToggle(trigger)}
                                            disabled={saving === trigger.id}
                                            className={`p-1.5 rounded transition-colors ${trigger.is_active ? "text-emerald-500 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted"}`}
                                            title={trigger.is_active ? "Deactivate" : "Activate"}
                                        >
                                            {saving === trigger.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(trigger)}
                                            disabled={deleting === trigger.id}
                                            className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            {deleting === trigger.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Linked Automated Email</Label>
                                            <select
                                                value={trigger.campaign_id || ""}
                                                onChange={e => handleUpdateCampaign(trigger.id, e.target.value)}
                                                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary cursor-pointer"
                                            >
                                                <option value="">— No email linked —</option>
                                                {automatedEmails.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                                            <div>
                                                <span className="font-semibold">Type:</span> {trigger.trigger_type}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Action:</span> {trigger.action_type.replace(/_/g, " ")}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Created:</span> {new Date(trigger.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        {trigger.generate_discount && trigger.discount_config && (
                                            <div className="bg-muted/50 rounded p-3 text-xs space-y-1">
                                                <p className="font-semibold text-foreground flex items-center gap-1"><TicketPercent className="w-3 h-3" /> Shopify Discount Config</p>
                                                <p>Type: {trigger.discount_config.type} | Value: {trigger.discount_config.type === "percentage" ? `${trigger.discount_config.value}%` : `$${trigger.discount_config.value}`}</p>
                                                <p>Prefix: {trigger.discount_config.codePrefix} | Valid: {trigger.discount_config.durationDays} days | Usage Limit: {trigger.discount_config.usageLimit}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
