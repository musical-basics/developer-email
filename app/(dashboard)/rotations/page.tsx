"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getRotations, createRotation, deleteRotation } from "@/app/actions/rotations"
import { getCampaignList } from "@/app/actions/campaigns"
import { RefreshCw, Plus, Trash2, ChevronRight, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function RotationsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [rotations, setRotations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        const [rots, campaigns] = await Promise.all([
            getRotations(),
            getCampaignList(),
        ])
        setRotations(rots)
        setTemplates(campaigns.filter((c: any) => c.is_template && c.is_ready))
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [])

    const handleCreate = async () => {
        if (!newName.trim() || selectedTemplateIds.length < 2) return
        setCreating(true)
        const result = await createRotation(newName.trim(), selectedTemplateIds)
        if (result.success) {
            toast({ title: "Rotation created", description: `"${newName}" with ${selectedTemplateIds.length} campaigns.` })
            setCreateOpen(false)
            setNewName("")
            setSelectedTemplateIds([])
            fetchData()
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
        setCreating(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this rotation? Child campaign stats will be preserved.")) return
        setDeletingId(id)
        await deleteRotation(id)
        toast({ title: "Rotation deleted" })
        fetchData()
        setDeletingId(null)
    }

    const toggleTemplate = (id: string) => {
        setSelectedTemplateIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-primary" />
                        Rotations
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Round-robin split tests — cycle through campaigns evenly to compare performance.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Rotation
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : rotations.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                    <RefreshCw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No rotations yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Create one to start split testing your campaigns.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {rotations.map((rot: any) => (
                        <button
                            key={rot.id}
                            onClick={() => router.push(`/rotations/${rot.id}`)}
                            className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Layers className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground truncate">{rot.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {rot.campaigns.length} campaigns · Cursor at position {rot.cursor_position + 1}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Campaign pills */}
                                    <div className="hidden sm:flex items-center gap-1.5">
                                        {rot.campaigns.slice(0, 4).map((c: any, i: number) => (
                                            <span
                                                key={c.id}
                                                className={`text-[10px] px-2 py-0.5 rounded-full border ${i === rot.cursor_position % rot.campaigns.length
                                                        ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                                                        : "bg-muted text-muted-foreground border-border"
                                                    }`}
                                            >
                                                {c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name}
                                            </span>
                                        ))}
                                        {rot.campaigns.length > 4 && (
                                            <span className="text-[10px] text-muted-foreground">+{rot.campaigns.length - 4}</span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(rot.id) }}
                                        disabled={deletingId === rot.id}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Rotation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Rotation Name</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. Keyboard Q&A Series"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Select Templates (min 2)</Label>
                            <p className="text-xs text-muted-foreground">
                                Only ready master templates are shown. Order matters — campaigns are sent in the order listed.
                            </p>
                            <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                                {templates.length === 0 ? (
                                    <p className="p-3 text-sm text-muted-foreground text-center">No ready templates available</p>
                                ) : templates.map((t: any) => {
                                    const isSelected = selectedTemplateIds.includes(t.id)
                                    const order = isSelected ? selectedTemplateIds.indexOf(t.id) + 1 : null
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => toggleTemplate(t.id)}
                                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                                                }`}
                                        >
                                            <span className={isSelected ? "text-foreground font-medium" : "text-muted-foreground"}>
                                                {t.name}
                                            </span>
                                            {order && (
                                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                    #{order}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                            {selectedTemplateIds.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Order: {selectedTemplateIds.map((id, i) => {
                                        const t = templates.find((t: any) => t.id === id)
                                        return `${i + 1}. ${t?.name || "?"}`
                                    }).join(" → ")}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || !newName.trim() || selectedTemplateIds.length < 2}
                        >
                            {creating ? "Creating..." : `Create (${selectedTemplateIds.length} campaigns)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
