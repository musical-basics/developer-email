"use client"

import { useEffect, useState } from "react"
import { TicketPercent, Plus, Trash2, Save, Loader2, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
    getDiscountPresets,
    createDiscountPreset,
    updateDiscountPreset,
    deleteDiscountPreset,
    type DiscountPreset
} from "@/app/actions/discount-presets"

const URL_KEY_OPTIONS: { value: string; label: string }[] = [
    { value: "main_cta_url", label: "Main CTA URL" },
    { value: "main_activate_url", label: "Activate URL" },
    { value: "crowdfunding_cta_url", label: "Crowdfunding CTA" },
    { value: "homepage_url", label: "Homepage URL" },
    { value: "shipping_url", label: "Shipping Info" },
]

type PresetDraft = Omit<DiscountPreset, "id" | "created_at"> & { id?: string }

export default function DiscountsPage() {
    const [presets, setPresets] = useState<DiscountPreset[]>([])
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const { toast } = useToast()

    // Drafts for editing (keyed by id or "new-{idx}")
    const [drafts, setDrafts] = useState<Record<string, PresetDraft>>({})
    const [newPresets, setNewPresets] = useState<PresetDraft[]>([])

    useEffect(() => {
        loadPresets()
    }, [])

    const loadPresets = async () => {
        try {
            const data = await getDiscountPresets()
            setPresets(data)
            // Initialize drafts
            const d: Record<string, PresetDraft> = {}
            data.forEach(p => { d[p.id] = { ...p } })
            setDrafts(d)
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const addNew = () => {
        setNewPresets(prev => [...prev, {
            name: "",
            type: "percentage",
            value: 5,
            duration_days: 2,
            code_prefix: "VIP",
            target_url_key: "main_cta_url",
            usage_limit: 1,
            is_active: true,
        }])
    }

    const updateDraft = (id: string, field: string, value: any) => {
        setDrafts(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }))
    }

    const updateNewPreset = (idx: number, field: string, value: any) => {
        setNewPresets(prev => {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], [field]: value }
            return updated
        })
    }

    const handleSave = async (id: string) => {
        setSavingId(id)
        try {
            const draft = drafts[id]
            const { id: _id, ...rest } = draft as any
            await updateDiscountPreset(id, rest)
            toast({ title: "Saved", description: `"${draft.name}" updated.` })
            await loadPresets()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        } finally {
            setSavingId(null)
        }
    }

    const handleCreate = async (idx: number) => {
        setSavingId(`new-${idx}`)
        try {
            const preset = newPresets[idx]
            if (!preset.name.trim()) {
                toast({ title: "Error", description: "Name is required.", variant: "destructive" })
                setSavingId(null)
                return
            }
            await createDiscountPreset(preset)
            toast({ title: "Created", description: `"${preset.name}" added.` })
            setNewPresets(prev => prev.filter((_, i) => i !== idx))
            await loadPresets()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        } finally {
            setSavingId(null)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        setDeletingId(id)
        try {
            await deleteDiscountPreset(id)
            toast({ title: "Deleted", description: `"${name}" removed.` })
            await loadPresets()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        } finally {
            setDeletingId(null)
        }
    }

    const handleToggleActive = async (id: string) => {
        const draft = drafts[id]
        if (!draft) return
        const next = !draft.is_active
        updateDraft(id, "is_active", next)
        try {
            await updateDiscountPreset(id, { is_active: next })
            toast({ title: next ? "Enabled" : "Disabled", description: `"${draft.name}" is now ${next ? "active" : "inactive"}.` })
            await loadPresets()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <TicketPercent className="w-6 h-6 text-emerald-400" />
                        Discounts
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Design discount presets. Active ones appear as buttons in the email editor.
                    </p>
                </div>
                <Button onClick={addNew} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Preset
                </Button>
            </div>

            <div className="space-y-4">
                {/* Existing presets */}
                {presets.map(preset => {
                    const draft = drafts[preset.id] || preset
                    return (
                        <PresetCard
                            key={preset.id}
                            draft={draft}
                            onChange={(field, value) => updateDraft(preset.id, field, value)}
                            onSave={() => handleSave(preset.id)}
                            onDelete={() => handleDelete(preset.id, draft.name)}
                            onToggleActive={() => handleToggleActive(preset.id)}
                            saving={savingId === preset.id}
                            deleting={deletingId === preset.id}
                        />
                    )
                })}

                {/* New presets (unsaved) */}
                {newPresets.map((preset, idx) => (
                    <PresetCard
                        key={`new-${idx}`}
                        draft={preset}
                        isNew
                        onChange={(field, value) => updateNewPreset(idx, field, value)}
                        onSave={() => handleCreate(idx)}
                        onDelete={() => setNewPresets(prev => prev.filter((_, i) => i !== idx))}
                        saving={savingId === `new-${idx}`}
                        deleting={false}
                    />
                ))}

                {presets.length === 0 && newPresets.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <TicketPercent className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">No discount presets yet.</p>
                            <Button variant="outline" onClick={addNew} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Create your first preset
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

// ─── Preset Card Component ──────────────────────────────────

function PresetCard({
    draft,
    isNew,
    onChange,
    onSave,
    onDelete,
    onToggleActive,
    saving,
    deleting,
}: {
    draft: PresetDraft
    isNew?: boolean
    onChange: (field: string, value: any) => void
    onSave: () => void
    onDelete: () => void
    onToggleActive?: () => void
    saving: boolean
    deleting: boolean
}) {
    const typeLabel = draft.type === "percentage" ? "%" : "$"
    const previewCode = `${draft.code_prefix}-XXXXXX`

    // Bidirectional: compute expiry from duration
    const expiryDate = new Date(Date.now() + draft.duration_days * 24 * 60 * 60 * 1000)
    const expiryStr = expiryDate.toISOString().split("T")[0]

    const handleDateChange = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = date.getTime() - now.getTime()
        const days = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
        onChange("duration_days", days)
    }

    return (
        <Card className={`${!draft.is_active && !isNew ? "opacity-50" : ""} transition-opacity`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${draft.type === "percentage" ? "bg-emerald-500/10 text-emerald-400" : "bg-violet-500/10 text-violet-400"}`}>
                            <TicketPercent className="w-4 h-4" />
                        </div>
                        <Input
                            value={draft.name}
                            onChange={e => onChange("name", e.target.value)}
                            placeholder="Preset name (e.g. VIP 5% Off)"
                            className="max-w-[260px] h-8 text-sm font-semibold"
                        />
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                            {previewCode}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isNew && onToggleActive && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={draft.is_active ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground"}
                                onClick={onToggleActive}
                                title={draft.is_active ? "Active — click to disable" : "Inactive — click to enable"}
                            >
                                <Power className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-red-400"
                            onClick={onDelete}
                            disabled={deleting}
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Type */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <Select value={draft.type} onValueChange={v => onChange("type", v)}>
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Value */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Value ({typeLabel})</Label>
                        <Input
                            type="number"
                            value={draft.value}
                            onChange={e => onChange("value", Number(e.target.value))}
                            min={1}
                            className="h-9"
                        />
                    </div>

                    {/* Code Prefix */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Code Prefix</Label>
                        <Input
                            value={draft.code_prefix}
                            onChange={e => onChange("code_prefix", e.target.value.toUpperCase())}
                            placeholder="VIP"
                            className="h-9 font-mono"
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Duration (days)</Label>
                        <Input
                            type="number"
                            value={draft.duration_days}
                            onChange={e => onChange("duration_days", Math.max(1, Number(e.target.value)))}
                            min={1}
                            className="h-9"
                        />
                    </div>

                    {/* Expiry Preview */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Expires on (if generated now)</Label>
                        <Input
                            type="date"
                            value={expiryStr}
                            onChange={e => handleDateChange(e.target.value)}
                            className="h-9"
                        />
                    </div>

                    {/* Target URL */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Target URL Key</Label>
                        <Select value={draft.target_url_key} onValueChange={v => onChange("target_url_key", v)}>
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {URL_KEY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                        <span className="text-[10px] text-muted-foreground ml-2 font-mono">{`{{${opt.value}}}`}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Usage Limit */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Usage Limit</Label>
                        <Input
                            type="number"
                            value={draft.usage_limit}
                            onChange={e => onChange("usage_limit", Math.max(1, Number(e.target.value)))}
                            min={1}
                            className="h-9"
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <Button onClick={onSave} disabled={saving} size="sm" className="gap-2">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isNew ? "Create" : "Save"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
