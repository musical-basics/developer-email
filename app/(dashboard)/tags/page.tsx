"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Loader2, Tag, Users, X, Check, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTags, createTag, updateTag, deleteTag, TagDefinition } from "@/app/actions/tags"

const PRESET_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#eab308", // yellow
    "#84cc16", // lime
    "#22c55e", // green
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#a855f7", // purple
    "#d946ef", // fuchsia
    "#ec4899", // pink
    "#f43f5e", // rose
    "#6b7280", // gray
]

export default function TagsPage() {
    const [tags, setTags] = useState<TagDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newTagName, setNewTagName] = useState("")
    const [newTagColor, setNewTagColor] = useState("#3b82f6")
    const [savingNew, setSavingNew] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editColor, setEditColor] = useState("")
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showColorPicker, setShowColorPicker] = useState<string | null>(null)

    const fetchTags = useCallback(async () => {
        setLoading(true)
        const { tags: data } = await getTags()
        setTags(data)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchTags()
    }, [fetchTags])

    const handleCreate = async () => {
        const name = newTagName.trim()
        if (!name) return

        setSavingNew(true)
        const { tag, error } = await createTag(name, newTagColor)
        if (error) {
            console.error("Error creating tag:", error)
        } else {
            setNewTagName("")
            setNewTagColor("#3b82f6")
            setCreating(false)
            await fetchTags()
        }
        setSavingNew(false)
    }

    const startEdit = (tag: TagDefinition) => {
        setEditingId(tag.id)
        setEditName(tag.name)
        setEditColor(tag.color)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName("")
        setEditColor("")
        setShowColorPicker(null)
    }

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return

        setSaving(true)
        const updates: { name?: string; color?: string } = {}
        const currentTag = tags.find(t => t.id === editingId)

        if (currentTag && editName.trim() !== currentTag.name) {
            updates.name = editName.trim()
        }
        if (currentTag && editColor !== currentTag.color) {
            updates.color = editColor
        }

        if (Object.keys(updates).length > 0) {
            const { error } = await updateTag(editingId, updates)
            if (error) {
                console.error("Error updating tag:", error)
            } else {
                await fetchTags()
            }
        }

        cancelEdit()
        setSaving(false)
    }

    const handleDelete = async (tag: TagDefinition) => {
        const msg = tag.subscriber_count
            ? `Delete "${tag.name}"? This will remove it from ${tag.subscriber_count} subscriber${tag.subscriber_count !== 1 ? "s" : ""}.`
            : `Delete "${tag.name}"?`
        if (!confirm(msg)) return

        setDeletingId(tag.id)
        const { error } = await deleteTag(tag.id)
        if (error) {
            console.error("Error deleting tag:", error)
        } else {
            await fetchTags()
        }
        setDeletingId(null)
    }

    const handleColorChange = async (tagId: string, color: string) => {
        // Inline color change (no edit mode needed)
        setSaving(true)
        const { error } = await updateTag(tagId, { color })
        if (error) {
            console.error("Error updating color:", error)
        } else {
            await fetchTags()
        }
        setShowColorPicker(null)
        setSaving(false)
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Tags Manager</h1>
                    <p className="text-muted-foreground">Create, edit, and organize subscriber tags</p>
                </div>
                {!creating && (
                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Tag
                    </button>
                )}
            </div>

            {/* Create New Tag */}
            {creating && (
                <div className="mb-6 rounded-lg border border-border bg-card p-5">
                    <h3 className="text-sm font-medium text-foreground mb-4">Create New Tag</h3>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-muted-foreground block mb-1.5">Name</label>
                            <input
                                autoFocus
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate()
                                    if (e.key === "Escape") {
                                        setCreating(false)
                                        setNewTagName("")
                                    }
                                }}
                                placeholder="e.g. VIP Account"
                                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">Color</label>
                            <div className="flex flex-wrap gap-1.5">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setNewTagColor(c)}
                                        className={cn(
                                            "w-6 h-6 rounded-full transition-all",
                                            newTagColor === c
                                                ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
                                                : "hover:scale-110",
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Preview */}
                    <div className="mt-4 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Preview:</span>
                        <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: newTagColor }}
                        >
                            {newTagName || "Tag Name"}
                        </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 justify-end">
                        <button
                            onClick={() => { setCreating(false); setNewTagName("") }}
                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!newTagName.trim() || savingNew}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {savingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Create Tag
                        </button>
                    </div>
                </div>
            )}

            {/* Tags List */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                            {tags.length} tag{tags.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                ) : tags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Tag className="w-10 h-10 text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground">No tags yet. Create one to start organizing subscribers.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {tags.map(tag => (
                            <div
                                key={tag.id}
                                className={cn(
                                    "group flex items-center gap-4 px-5 py-3.5 transition-colors",
                                    editingId === tag.id ? "bg-muted/30" : "hover:bg-muted/20",
                                )}
                            >
                                {editingId === tag.id ? (
                                    /* ─── Edit Mode ─── */
                                    <>
                                        {/* Color swatch + inline picker */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowColorPicker(showColorPicker === tag.id ? null : tag.id)}
                                                className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
                                                style={{ backgroundColor: editColor }}
                                            />
                                            {showColorPicker === tag.id && (
                                                <div className="absolute top-10 left-0 z-20 p-2 rounded-lg bg-popover border border-border shadow-xl grid grid-cols-4 gap-1.5">
                                                    {PRESET_COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => { setEditColor(c); setShowColorPicker(null) }}
                                                            className={cn(
                                                                "w-7 h-7 rounded-full transition-all hover:scale-110",
                                                                editColor === c && "ring-2 ring-offset-2 ring-offset-popover ring-white",
                                                            )}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            autoFocus
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleSaveEdit()
                                                if (e.key === "Escape") cancelEdit()
                                            }}
                                            className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={saving || !editName.trim()}
                                                className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
                                                title="Save"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* ─── Display Mode ─── */
                                    <>
                                        {/* Color swatch with click-to-change */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowColorPicker(showColorPicker === tag.id ? null : tag.id)}
                                                className="w-8 h-8 rounded-full border-2 border-transparent hover:border-border hover:scale-110 transition-all cursor-pointer"
                                                style={{ backgroundColor: tag.color }}
                                                title="Change color"
                                            />
                                            {showColorPicker === tag.id && (
                                                <div className="absolute top-10 left-0 z-20 p-2 rounded-lg bg-popover border border-border shadow-xl grid grid-cols-4 gap-1.5">
                                                    {PRESET_COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => handleColorChange(tag.id, c)}
                                                            className={cn(
                                                                "w-7 h-7 rounded-full transition-all hover:scale-110",
                                                                tag.color === c && "ring-2 ring-offset-2 ring-offset-popover ring-white",
                                                            )}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Tag badge */}
                                        <div className="flex-1 min-w-0">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white"
                                                style={{ backgroundColor: tag.color }}
                                            >
                                                {tag.name}
                                            </span>
                                        </div>

                                        {/* Subscriber count */}
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{tag.subscriber_count || 0}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(tag)}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                title="Edit tag"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tag)}
                                                disabled={deletingId === tag.id}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                title="Delete tag"
                                            >
                                                {deletingId === tag.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
