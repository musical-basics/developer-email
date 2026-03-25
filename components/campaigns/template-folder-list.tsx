"use client"

import { useState, useTransition } from "react"
import { FolderPlus, FolderOpen, ChevronRight, ChevronDown, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CampaignsTable } from "@/components/campaigns-table"
import { Campaign } from "@/lib/types"
import {
    createTemplateFolder,
    renameTemplateFolder,
    deleteTemplateFolder,
    type TemplateFolder,
} from "@/app/actions/template-folders"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface TemplateFolderListProps {
    folders: TemplateFolder[]
    templates: Campaign[]
}

export function TemplateFolderList({ folders, templates }: TemplateFolderListProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
        () => new Set(folders.map(f => f.id)) // all expanded by default
    )
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const [creatingFolder, setCreatingFolder] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const { toast } = useToast()

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleCreate = () => {
        if (!newFolderName.trim()) return
        startTransition(async () => {
            const result = await createTemplateFolder(newFolderName.trim())
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" })
            } else {
                toast({ title: "Folder created", description: `"${newFolderName.trim()}" has been created.` })
                setNewFolderName("")
                setCreatingFolder(false)
                router.refresh()
            }
        })
    }

    const handleRename = (id: string) => {
        if (!renameValue.trim()) return
        startTransition(async () => {
            const result = await renameTemplateFolder(id, renameValue.trim())
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" })
            } else {
                toast({ title: "Folder renamed" })
                setRenamingId(null)
                router.refresh()
            }
        })
    }

    const handleDelete = (id: string, name: string) => {
        const confirmed = window.confirm(`Delete folder "${name}"? Templates inside will be moved to Uncategorized.`)
        if (!confirmed) return
        startTransition(async () => {
            const result = await deleteTemplateFolder(id)
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" })
            } else {
                toast({ title: "Folder deleted", description: "Templates moved to Uncategorized." })
                router.refresh()
            }
        })
    }

    // Group templates into folders
    const folderTemplates: Record<string, Campaign[]> = {}
    const uncategorized: Campaign[] = []

    templates.forEach(t => {
        if (t.template_folder_id && folders.some(f => f.id === t.template_folder_id)) {
            if (!folderTemplates[t.template_folder_id]) folderTemplates[t.template_folder_id] = []
            folderTemplates[t.template_folder_id].push(t)
        } else {
            uncategorized.push(t)
        }
    })

    return (
        <div className="space-y-2">
            {/* Header with Create Folder */}
            <div className="flex items-center justify-between px-1 mb-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Folders
                </span>
                {creatingFolder ? (
                    <div className="flex items-center gap-1.5">
                        <Input
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="h-7 text-xs w-40"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate()
                                if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") }
                            }}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-emerald-400 hover:text-emerald-300"
                            onClick={handleCreate}
                            disabled={isPending || !newFolderName.trim()}
                        >
                            <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => { setCreatingFolder(false); setNewFolderName("") }}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setCreatingFolder(true)}
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        New Folder
                    </Button>
                )}
            </div>

            {/* Folder sections */}
            {folders.map(folder => {
                const isExpanded = expandedFolders.has(folder.id)
                const count = folderTemplates[folder.id]?.length || 0
                const isRenaming = renamingId === folder.id

                return (
                    <div key={folder.id} className="rounded-lg border border-border bg-card overflow-hidden">
                        {/* Folder header */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card hover:bg-accent/30 transition-colors">
                            <button
                                onClick={() => toggleFolder(folder.id)}
                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                                {isExpanded
                                    ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                }
                                <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                {isRenaming ? (
                                    <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                                        <Input
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            className="h-6 text-sm py-0 px-2"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleRename(folder.id)
                                                if (e.key === "Escape") setRenamingId(null)
                                            }}
                                        />
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-6 w-6 text-emerald-400 hover:text-emerald-300"
                                            onClick={() => handleRename(folder.id)}
                                            disabled={isPending}
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                            onClick={() => setRenamingId(null)}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-sm font-medium text-foreground truncate">{folder.name}</span>
                                        <span className="text-xs text-muted-foreground ml-1">({count})</span>
                                    </>
                                )}
                            </button>
                            {!isRenaming && (
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        title="Rename folder"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setRenamingId(folder.id)
                                            setRenameValue(folder.name)
                                        }}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500/70 hover:text-red-500"
                                        title="Delete folder"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(folder.id, folder.name)
                                        }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Folder content */}
                        {isExpanded && (
                            <CampaignsTable
                                title=""
                                campaigns={folderTemplates[folder.id] || []}
                                loading={false}
                                showAnalytics={false}
                                enableBulkDelete={false}
                                sortBy="created_at"
                                paginate={false}
                                showFolderActions
                                folders={folders}
                            />
                        )}
                    </div>
                )
            })}

            {/* Uncategorized section */}
            {uncategorized.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <CampaignsTable
                        title={folders.length > 0 ? "Uncategorized" : "Master Templates"}
                        campaigns={uncategorized}
                        loading={false}
                        showAnalytics={false}
                        enableBulkDelete={false}
                        sortBy="created_at"
                        paginate={false}
                        showFolderActions
                        folders={folders}
                    />
                </div>
            )}

            {/* Empty state */}
            {templates.length === 0 && (
                <div className="rounded-lg border border-border bg-card px-6 py-12 text-center text-muted-foreground">
                    No master templates found. Create a campaign and promote it to a Master Template.
                </div>
            )}
        </div>
    )
}
