"use client"

import { useState, useMemo, useEffect } from "react"
import {
    Users,
    Search,
    Filter,
    Download,
    Upload,
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    X,
    UserCheck,
    UserX,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { Subscriber } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

const allTags = ["Admin", "Piano", "Student", "Theory", "VIP", "Beginner", "Advanced"]

const tagColors: Record<string, string> = {
    Admin: "bg-red-500/20 text-red-400 border-red-500/30",
    Piano: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Student: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Theory: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    VIP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Beginner: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    Advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
}

const statusStyles: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    bounced: "bg-red-500/20 text-red-400 border-red-500/30",
    unsubscribed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

function getInitials(firstName: string, lastName: string): string {
    return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase()
}

function formatDate(dateString: string): string {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

export default function AudienceManagerPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isNewSubscriber, setIsNewSubscriber] = useState(false)
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)

    // Form State
    const [formData, setFormData] = useState<Partial<Subscriber>>({
        email: "",
        first_name: "",
        last_name: "",
        tags: [],
        status: "active",
    })
    const [newTag, setNewTag] = useState("")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()
    const { toast } = useToast()

    // Fetch Subscribers
    const fetchSubscribers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("subscribers")
            .select("*")
            .order("created_at", { ascending: false })

        if (data) {
            setSubscribers(data as Subscriber[])
        } else if (error) {
            console.error("Error fetching subscribers:", error)
            toast({
                title: "Error fetching subscribers",
                description: error.message,
                variant: "destructive",
            })
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchSubscribers()
    }, [])

    // Stats
    const stats = useMemo(() => {
        const total = subscribers.length
        const active = subscribers.filter((s) => s.status === "active").length
        const unsubscribed = subscribers.filter((s) => s.status === "unsubscribed").length
        return { total, active, unsubscribed }
    }, [subscribers])

    // Filtered subscribers
    const filteredSubscribers = useMemo(() => {
        return subscribers.filter((subscriber) => {
            const matchesSearch =
                subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (subscriber.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (subscriber.last_name || "").toLowerCase().includes(searchQuery.toLowerCase())

            const subscriberTags = subscriber.tags || []
            const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => subscriberTags.includes(tag))

            return matchesSearch && matchesTags
        })
    }, [subscribers, searchQuery, selectedTags])

    const handleTagToggle = (tag: string) => {
        setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    }

    const handleSelectAll = () => {
        if (selectedIds.length === filteredSubscribers.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredSubscribers.map((s) => s.id))
        }
    }

    const handleSelectOne = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    }

    const handleEdit = (subscriber: Subscriber) => {
        setFormData(subscriber)
        setIsNewSubscriber(false)
        setIsDrawerOpen(true)
    }

    const handleAddSubscriber = () => {
        setFormData({
            email: "",
            first_name: "",
            last_name: "",
            tags: [],
            status: "active",
        })
        setIsNewSubscriber(true)
        setIsDrawerOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        const payload = {
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            tags: formData.tags || [],
            status: formData.status,
        }

        let error

        if (isNewSubscriber) {
            const { error: insertError } = await supabase
                .from("subscribers")
                .insert([payload])
            error = insertError
        } else if (formData.id) {
            const { error: updateError } = await supabase
                .from("subscribers")
                .update(payload)
                .eq("id", formData.id)
            error = updateError
        }

        if (error) {
            toast({
                title: "Error saving subscriber",
                description: error.message,
                variant: "destructive",
            })
        } else {
            toast({
                title: isNewSubscriber ? "Subscriber added" : "Subscriber updated",
                description: "The changes have been saved successfully.",
            })
            setIsDrawerOpen(false)
            fetchSubscribers()
        }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("subscribers").delete().eq("id", id)

        if (error) {
            toast({
                title: "Error deleting subscriber",
                description: error.message,
                variant: "destructive",
            })
        } else {
            toast({
                title: "Subscriber deleted",
                description: "The subscriber has been removed.",
            })
            // Optimistic update or refresh
            setSubscribers((prev) => prev.filter((s) => s.id !== id))
            setSelectedIds((prev) => prev.filter((i) => i !== id))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return

        const { error } = await supabase
            .from("subscribers")
            .delete()
            .in("id", selectedIds)

        if (error) {
            toast({
                title: "Error deleting subscribers",
                description: error.message,
                variant: "destructive",
            })
        } else {
            toast({
                title: "Subscribers deleted",
                description: `${selectedIds.length} subscribers have been removed.`,
            })
            setSubscribers((prev) => prev.filter((s) => !selectedIds.includes(s.id)))
            setSelectedIds([])
        }
        setIsDeleteAlertOpen(false)
    }

    const handleAddTag = () => {
        const tag = newTag.trim()
        const currentTags = formData.tags || []
        if (tag && !currentTags.includes(tag)) {
            setFormData({ ...formData, tags: [...currentTags, tag] })
            setNewTag("")
        }
    }

    const handleRemoveTag = (tagToRemove: string) => {
        const currentTags = formData.tags || []
        setFormData({ ...formData, tags: currentTags.filter((tag) => tag !== tagToRemove) })
    }

    const allSelected = filteredSubscribers.length > 0 && selectedIds.length === filteredSubscribers.length
    const someSelected = selectedIds.length > 0 && selectedIds.length < filteredSubscribers.length

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <Users className="h-5 w-5 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Audience Manager</h1>
                </div>
                <p className="text-muted-foreground">
                    Manage your subscribers, tags, and segmentation for your email campaigns.
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card className="bg-card border-border">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                            <Users className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Subscribers</p>
                            <p className="text-3xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                            <UserCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Active</p>
                            <p className="text-3xl font-bold text-foreground">{stats.active.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-500/10">
                            <UserX className="h-6 w-6 text-zinc-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Unsubscribed</p>
                            <p className="text-3xl font-bold text-foreground">{stats.unsubscribed.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex flex-1 items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by email or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-card border-border"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 border-border bg-transparent">
                                <Filter className="h-4 w-4" />
                                Filter by Tag
                                {selectedTags.length > 0 && (
                                    <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-zinc-900">
                                        {selectedTags.length}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            {allTags.map((tag) => (
                                <DropdownMenuCheckboxItem
                                    key={tag}
                                    checked={selectedTags.includes(tag)}
                                    onCheckedChange={() => handleTagToggle(tag)}
                                >
                                    {tag}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 ? (
                        <>
                            <Button variant="ghost" onClick={() => setSelectedIds([])}>
                                Cancel ({selectedIds.length})
                            </Button>
                            <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} className="gap-2">
                                <Trash2 className="h-4 w-4" />
                                Delete Selected
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" className="gap-2">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                            <Button variant="secondary" className="gap-2">
                                <Upload className="h-4 w-4" />
                                Import CSV
                            </Button>
                            <Button onClick={handleAddSubscriber} className="gap-2 bg-amber-500 text-zinc-900 hover:bg-amber-400">
                                <Plus className="h-4 w-4" />
                                Add Subscriber
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={allSelected}
                                    ref={(el) => {
                                        if (el) {
                                            const element = el as HTMLButtonElement & { indeterminate: boolean }
                                            element.indeterminate = someSelected
                                        }
                                    }}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Profile</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added</TableHead>
                            <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    Loading subscribers...
                                </TableCell>
                            </TableRow>
                        ) : filteredSubscribers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No subscribers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubscribers.map((subscriber) => (
                                <TableRow
                                    key={subscriber.id}
                                    className="border-border cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleEdit(subscriber)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.includes(subscriber.id)}
                                            onCheckedChange={() => handleSelectOne(subscriber.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-border">
                                                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                                    {getInitials(subscriber.first_name, subscriber.last_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-foreground">{subscriber.email}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {subscriber.first_name} {subscriber.last_name}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(subscriber.tags || []).length > 0 ? (
                                                (subscriber.tags || []).map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="outline"
                                                        className={tagColors[tag] || "bg-muted text-muted-foreground"}
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusStyles[subscriber.status] || "bg-muted"}>
                                            {subscriber.status.charAt(0).toUpperCase() + subscriber.status.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{formatDate(subscriber.created_at)}</TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(subscriber)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(subscriber.id)}
                                                    className="text-red-400 focus:text-red-400"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Drawer */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{isNewSubscriber ? "Add Subscriber" : "Edit Subscriber"}</SheetTitle>
                        <SheetDescription>
                            {isNewSubscriber ? "Add a new subscriber to your audience." : "Update subscriber details."}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-foreground">Personal Details</h3>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="subscriber@example.com"
                                    className="bg-card"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        placeholder="John"
                                        className="bg-card"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        placeholder="Doe"
                                        className="bg-card"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <div className="flex gap-2">
                                    {['active', 'unsubscribed', 'bounced'].map((s) => (
                                        <Button
                                            key={s}
                                            type="button"
                                            variant={formData.status === s ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setFormData({ ...formData, status: s as any })}
                                            className="capitalize"
                                        >
                                            {s}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tag Manager */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-foreground">Tag Manager</h3>

                            <div className="flex gap-2">
                                <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Add a new tag..."
                                    className="bg-card"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault()
                                            handleAddTag()
                                        }
                                    }}
                                />
                                <Button type="button" onClick={handleAddTag} variant="secondary" size="icon">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(formData.tags || []).length > 0 ? (
                                    (formData.tags || []).map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="outline"
                                            className={`${tagColors[tag] || "bg-muted text-muted-foreground"} pr-1`}
                                        >
                                            {tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                                            >
                                                <X className="h-3 w-3" />
                                                <span className="sr-only">Remove {tag} tag</span>
                                            </button>
                                        </Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No tags added yet</p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" onClick={() => setIsDrawerOpen(false)} className="flex-1 bg-transparent">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-amber-500 text-zinc-900 hover:bg-amber-400">
                                {saving ? "Saving..." : (isNewSubscriber ? "Add Subscriber" : "Save Changes")}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete {selectedIds.length} subscriber{selectedIds.length === 1 ? '' : 's'}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
