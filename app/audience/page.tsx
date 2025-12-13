"use client"

import { useState, useMemo } from "react"
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Types
type SubscriberStatus = "Active" | "Bounced" | "Unsubscribed"

interface Subscriber {
    id: string
    email: string
    firstName: string
    lastName: string
    tags: string[]
    status: SubscriberStatus
    addedAt: string
    notes: string
}

// Mock Data
const initialSubscribers: Subscriber[] = [
    {
        id: "1",
        email: "lionel@musicalbasics.com",
        firstName: "Lionel",
        lastName: "Yu",
        tags: ["Admin", "Piano"],
        status: "Active",
        addedAt: "2024-12-12",
        notes: "Founder and admin. Prefers communication via email.",
    },
    {
        id: "2",
        email: "student@example.com",
        firstName: "Alice",
        lastName: "Johnson",
        tags: ["Student", "Theory"],
        status: "Active",
        addedAt: "2024-11-28",
        notes: "Enrolled in music theory course. Very engaged student.",
    },
    {
        id: "3",
        email: "olduser@test.com",
        firstName: "Bob",
        lastName: "Smith",
        tags: [],
        status: "Bounced",
        addedAt: "2024-10-15",
        notes: "Email bounced multiple times. Need to verify address.",
    },
    {
        id: "4",
        email: "vip.member@music.com",
        firstName: "Sarah",
        lastName: "Williams",
        tags: ["VIP", "Piano", "Theory"],
        status: "Active",
        addedAt: "2024-09-20",
        notes: "Long-time VIP member. Completed multiple courses.",
    },
    {
        id: "5",
        email: "inactive@user.com",
        firstName: "Mike",
        lastName: "Brown",
        tags: ["Student"],
        status: "Unsubscribed",
        addedAt: "2024-08-05",
        notes: "Unsubscribed due to moving abroad.",
    },
]

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
    Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Bounced: "bg-red-500/20 text-red-400 border-red-500/30",
    Unsubscribed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

import { AppSidebar } from "@/components/app-sidebar"

export default function AudienceManagerPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isNewSubscriber, setIsNewSubscriber] = useState(false)
    const [formData, setFormData] = useState<Subscriber>({
        id: "",
        email: "",
        firstName: "",
        lastName: "",
        tags: [],
        status: "Active",
        addedAt: new Date().toISOString().split("T")[0],
        notes: "",
    })
    const [newTag, setNewTag] = useState("")

    // Stats
    const stats = useMemo(() => {
        const total = subscribers.length
        const active = subscribers.filter((s) => s.status === "Active").length
        const unsubscribed = subscribers.filter((s) => s.status === "Unsubscribed").length
        return { total, active, unsubscribed }
    }, [subscribers])

    // Filtered subscribers
    const filteredSubscribers = useMemo(() => {
        return subscribers.filter((subscriber) => {
            const matchesSearch =
                subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                subscriber.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                subscriber.lastName.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => subscriber.tags.includes(tag))

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
        setEditingSubscriber(subscriber)
        setFormData(subscriber)
        setIsNewSubscriber(false)
        setIsDrawerOpen(true)
    }

    const handleAddSubscriber = () => {
        setEditingSubscriber(null)
        setFormData({
            id: crypto.randomUUID(),
            email: "",
            firstName: "",
            lastName: "",
            tags: [],
            status: "Active",
            addedAt: new Date().toISOString().split("T")[0],
            notes: "",
        })
        setIsNewSubscriber(true)
        setIsDrawerOpen(true)
    }

    const handleSave = () => {
        if (isNewSubscriber) {
            setSubscribers((prev) => [formData, ...prev])
        } else {
            setSubscribers((prev) => prev.map((s) => (s.id === formData.id ? formData : s)))
        }
        setIsDrawerOpen(false)
    }

    const handleDelete = (id: string) => {
        setSubscribers((prev) => prev.filter((s) => s.id !== id))
        setSelectedIds((prev) => prev.filter((i) => i !== id))
    }

    const handleAddTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] })
            setNewTag("")
        }
    }

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({ ...formData, tags: formData.tags.filter((tag) => tag !== tagToRemove) })
    }

    const allSelected = filteredSubscribers.length > 0 && selectedIds.length === filteredSubscribers.length
    const someSelected = selectedIds.length > 0 && selectedIds.length < filteredSubscribers.length

    return (
        <div className="min-h-screen bg-background">
            <AppSidebar />
            <main className="pl-64">
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
                                {filteredSubscribers.map((subscriber) => (
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
                                                        {getInitials(subscriber.firstName, subscriber.lastName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-foreground">{subscriber.email}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {subscriber.firstName} {subscriber.lastName}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1.5">
                                                {subscriber.tags.length > 0 ? (
                                                    subscriber.tags.map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant="outline"
                                                            className={tagColors[tag] || "bg-muted text-muted-foreground"}
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEdit(subscriber)
                                                        }}
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" />
                                                        Add tag
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={statusStyles[subscriber.status]}>
                                                {subscriber.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{formatDate(subscriber.addedAt)}</TableCell>
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
                                ))}
                            </TableBody>
                        </Table>
                        {filteredSubscribers.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <p>No subscribers found</p>
                            </div>
                        )}
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
                                                value={formData.firstName}
                                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                placeholder="John"
                                                className="bg-card"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                value={formData.lastName}
                                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                placeholder="Doe"
                                                className="bg-card"
                                            />
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
                                        {formData.tags.length > 0 ? (
                                            formData.tags.map((tag) => (
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

                                {/* Internal Notes */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-foreground">Internal Notes</h3>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Add notes about this subscriber..."
                                        className="min-h-[100px] bg-card"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" onClick={() => setIsDrawerOpen(false)} className="flex-1 bg-transparent">
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave} className="flex-1 bg-amber-500 text-zinc-900 hover:bg-amber-400">
                                        {isNewSubscriber ? "Add Subscriber" : "Save Changes"}
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </main>
        </div>
    )
}
