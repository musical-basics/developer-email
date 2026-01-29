"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Campaign } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Copy, ChevronDown, LayoutTemplate, PenLine, Trash2, Eye, MousePointer2, Clock, MoreHorizontal, ArrowRight } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { duplicateCampaign, deleteCampaign } from "@/app/actions/campaigns"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

const statusStyles: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    draft: "bg-muted text-muted-foreground border-border",
}

const formatDuration = (seconds: number) => {
    if (!seconds) return "—"
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
}

interface CampaignsTableProps {
    campaigns: Campaign[]
    loading: boolean
    onRefresh?: () => void
    title?: string
}

export function CampaignsTable({ campaigns = [], loading, onRefresh, title = "Recent Campaigns" }: CampaignsTableProps) {
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [newName, setNewName] = useState("")
    const [renaming, setRenaming] = useState(false)
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

    const supabase = createClient()
    const { toast } = useToast()
    const router = useRouter()

    const handleEditClick = (campaign: Campaign) => {
        setEditingCampaign(campaign)
        setNewName(campaign.name)
    }

    const handleRename = async () => {
        if (!editingCampaign) return
        setRenaming(true)

        const { error } = await supabase
            .from("campaigns")
            .update({ name: newName })
            .eq("id", editingCampaign.id)

        if (!error) {
            setEditingCampaign(null)
            if (onRefresh) onRefresh()
            router.refresh()
        } else {
            console.error("Error renaming campaign:", error)
            toast({
                title: "Error renaming campaign",
                description: error.message,
                variant: "destructive",
            })
        }
        setRenaming(false)
    }

    const handleDuplicate = async (campaignId: string) => {
        setDuplicatingId(campaignId)
        try {
            const result = await duplicateCampaign(campaignId)

            if (result.error) {
                throw new Error(result.error)
            }

            toast({
                title: "Campaign duplicated",
                description: "A copy of the campaign has been created.",
            })

            if (onRefresh) onRefresh()
            router.refresh() // Refresh server components

        } catch (error: any) {
            console.error("Error duplicating campaign:", error)
            toast({
                title: "Error duplicating campaign",
                description: error.message || "Failed to duplicate",
                variant: "destructive",
            })
        } finally {
            setDuplicatingId(null)
        }
    }
    const handleDelete = async (campaignId: string) => {
        setDeletingId(campaignId)
        try {
            const result = await deleteCampaign(campaignId)

            if (result.error) {
                throw new Error(result.error)
            }

            toast({
                title: "Campaign deleted",
                description: "The campaign has been permanently removed.",
            })

            if (onRefresh) onRefresh()
            router.refresh()

        } catch (error: any) {
            console.error("Error deleting campaign:", error)
            toast({
                title: "Error deleting campaign",
                description: error.message || "Failed to delete",
                variant: "destructive",
            })
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) {
        return <div className="text-center py-10 text-muted-foreground opacity-50">Loading metrics...</div>
    }

    return (
        <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground w-[300px]">Campaign</TableHead>
                        <TableHead className="text-center w-[100px]">Status</TableHead>
                        {/* New Metrics Columns */}
                        <TableHead className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                Open Rate
                            </div>
                        </TableHead>
                        <TableHead className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <MousePointer2 className="h-3.5 w-3.5 text-muted-foreground" />
                                Click Rate
                            </div>
                        </TableHead>
                        <TableHead className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                Avg Time
                            </div>
                        </TableHead>
                        <TableHead className="text-right w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {campaigns.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No campaigns found. Create one to get started.
                            </TableCell>
                        </TableRow>
                    ) : (
                        campaigns.map((campaign) => {
                            const recipients = campaign.total_recipients || 0
                            const openRate = recipients > 0 ? Math.round((campaign.total_opens / recipients) * 100) : 0
                            const clickRate = recipients > 0 ? Math.round((campaign.total_clicks / recipients) * 100) : 0

                            return (
                                <TableRow key={campaign.id} className="border-border">
                                    {/* Name & Metadata */}
                                    <TableCell>
                                        <div className="flex flex-col group">
                                            <div className="flex items-center gap-2">
                                                <Link href={`/dashboard/${campaign.id}`} className="font-medium text-foreground hover:underline">
                                                    {campaign.name || "Untitled Campaign"}
                                                </Link>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        handleEditClick(campaign)
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                                    title="Rename"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={`
                                            capitalize border-opacity-50
                                            ${campaign.status === 'completed' ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : ''}
                                            ${campaign.status === 'draft' ? 'text-zinc-400 border-zinc-500/50 bg-zinc-500/10' : ''}
                                        `}>
                                            {campaign.status}
                                        </Badge>
                                    </TableCell>

                                    {/* METRICS */}
                                    <TableCell className="text-right font-mono">
                                        {recipients > 0 ? (
                                            <span className={openRate > 20 ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                                                {openRate}%
                                            </span>
                                        ) : "—"}
                                    </TableCell>

                                    <TableCell className="text-right font-mono">
                                        {recipients > 0 ? (
                                            <span className={clickRate > 2 ? "text-blue-400 font-bold" : "text-muted-foreground"}>
                                                {clickRate}%
                                            </span>
                                        ) : "—"}
                                    </TableCell>

                                    <TableCell className="text-right font-mono text-amber-400">
                                        {formatDuration(campaign.average_read_time)}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDuplicate(campaign.id)}
                                                disabled={duplicatingId === campaign.id}
                                                className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 hidden md:flex"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/${campaign.id}`} className="flex items-center gap-2">
                                                            <ArrowRight className="h-3 w-3" />
                                                            <span>Manage</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/editor?id=${campaign.id}`} className="flex items-center gap-2">
                                                            <PenLine className="h-3 w-3 text-muted-foreground" />
                                                            <span>Classic Editor</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/modular-editor?id=${campaign.id}`} className="flex items-center gap-2">
                                                            <LayoutTemplate className="h-3 w-3 text-muted-foreground" />
                                                            <span>Modular Editor</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(campaign.id)}
                                                        disabled={deletingId === campaign.id}
                                                        className="text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-2" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>

            <Dialog open={!!editingCampaign} onOpenChange={(open) => !open && setEditingCampaign(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Campaign Name</Label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter campaign name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCampaign(null)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={renaming}>
                            {renaming ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
