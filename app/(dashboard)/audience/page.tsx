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
    LayoutGrid,
    List,
    Check,
    ChevronsUpDown,
    Send,
    Copy,
    Loader2,
    GitBranch,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FilterX,
    FileUp,
    UsersRound,
    Tag,
    FlaskConical,
    Bookmark,
    Save,
    Eye,
    Mail,
    MailX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TagGroupView } from "@/components/audience/tag-group-view"
import { SubscriberHistoryTimeline } from "@/components/audience/subscriber-history-timeline"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { createCampaignForSubscriber, getCampaignList, duplicateCampaignForSubscriber, createBulkCampaign } from "@/app/actions/campaigns"
import { getChains, type ChainRow } from "@/app/actions/chains"
import { startChainProcess } from "@/app/actions/chain-processes"
import { getTags, type TagDefinition } from "@/app/actions/tags"
import { useRouter } from "next/navigation"
import { Subscriber, Campaign } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { softDeleteSubscriber, bulkSoftDeleteSubscribers } from "@/app/actions/subscribers"
import { getSavedViews, createSavedView, deleteSavedView, type SavedView } from "@/app/actions/saved-views"

const statusStyles: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    inactive: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    bounced: "bg-red-500/20 text-red-400 border-red-500/30",
    unsubscribed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

const ACTIVE_VIEW_KEY = "audience_active_view"

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
    const [lastSentSubjects, setLastSentSubjects] = useState<Record<string, { subject: string; sentAt: string }>>({})
    const [searchQuery, setSearchQuery] = useState("")
    const [showTestOnly, setShowTestOnly] = useState(false)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [excludedTags, setExcludedTags] = useState<string[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isNewSubscriber, setIsNewSubscriber] = useState(false)
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
    const [subscriberToDelete, setSubscriberToDelete] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"list" | "tags">("list")
    const [tagComboboxOpen, setTagComboboxOpen] = useState(false)
    const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([])
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
    const [expandedSubscriberId, setExpandedSubscriberId] = useState<string | null>(null)
    const [lastEmailedSort, setLastEmailedSort] = useState<"asc" | "desc" | null>(null)
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [neverEmailedFilter, setNeverEmailedFilter] = useState(false)

    // Pagination
    const [pageSize, setPageSize] = useState(25)
    const [currentPage, setCurrentPage] = useState(1)

    // Saved Views — loaded from DB on mount
    const [savedViews, setSavedViews] = useState<SavedView[]>([])
    const [activeViewId, setActiveViewId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null
        return localStorage.getItem(ACTIVE_VIEW_KEY)
    })
    const [savingViewName, setSavingViewName] = useState(false)
    const [newViewName, setNewViewName] = useState("")

    // Send Existing Campaign State
    const [isSelectCampaignOpen, setIsSelectCampaignOpen] = useState(false)
    const [targetSubscriber, setTargetSubscriber] = useState<Subscriber | null>(null)
    const [existingCampaigns, setExistingCampaigns] = useState<Campaign[]>([])
    const [loadingCampaigns, setLoadingCampaigns] = useState(false)
    const [duplicating, setDuplicating] = useState(false)

    // Bulk Send State
    const [bulkSendMode, setBulkSendMode] = useState(false)

    // Start Chain State
    const [isChainPickerOpen, setIsChainPickerOpen] = useState(false)
    const [chainTarget, setChainTarget] = useState<Subscriber | null>(null)
    const [availableChains, setAvailableChains] = useState<ChainRow[]>([])
    const [loadingChains, setLoadingChains] = useState(false)
    const [startingChain, setStartingChain] = useState(false)

    // Bulk Add State
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false)
    const [bulkEmails, setBulkEmails] = useState("")
    const [bulkAdding, setBulkAdding] = useState(false)

    // CSV Import State
    const [isCsvImportOpen, setIsCsvImportOpen] = useState(false)
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [csvPreview, setCsvPreview] = useState<string[][]>([])
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [csvImporting, setCsvImporting] = useState(false)

    // Bulk Tag State
    const [isBulkTagOpen, setIsBulkTagOpen] = useState(false)
    const [bulkTagSelections, setBulkTagSelections] = useState<string[]>([])
    const [bulkTagging, setBulkTagging] = useState(false)

    // Form State
    const [formData, setFormData] = useState<Partial<Subscriber>>({
        email: "",
        first_name: "",
        last_name: "",
        country: "",
        country_code: "",
        phone_code: "",
        phone_number: "",
        shipping_address1: "",
        shipping_address2: "",
        shipping_city: "",
        shipping_zip: "",
        shipping_province: "",
        tags: [],
        status: "active",
    })
    const [newTag, setNewTag] = useState("")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()
    const { toast } = useToast()
    const router = useRouter()

    // Fetch Subscribers
    const fetchSubscribers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("subscribers")
            .select("id, email, first_name, last_name, country, country_code, phone_code, phone_number, shipping_address1, shipping_address2, shipping_city, shipping_zip, shipping_province, tags, status, created_at")
            .neq("status", "deleted")
            .order("created_at", { ascending: false })

        if (data) {
            setSubscribers(data as Subscriber[])

            // Fetch last sent email subject per subscriber
            const subIds = data.map((s: any) => s.id)
            if (subIds.length > 0) {
                const { data: sentData } = await supabase
                    .from("sent_history")
                    .select("subscriber_id, sent_at, campaign_id, campaigns(subject_line)")
                    .in("subscriber_id", subIds)
                    .order("sent_at", { ascending: false })

                if (sentData) {
                    const lookup: Record<string, { subject: string; sentAt: string }> = {}
                    sentData.forEach((row: any) => {
                        if (!lookup[row.subscriber_id]) {
                            const subject = row.campaigns?.subject_line
                            if (subject) lookup[row.subscriber_id] = { subject, sentAt: row.sent_at }
                        }
                    })
                    setLastSentSubjects(lookup)
                }
            }
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

    const fetchTagDefinitions = async () => {
        const { tags: defs } = await getTags()
        setTagDefinitions(defs)
    }

    useEffect(() => {
        fetchSubscribers()
        fetchTagDefinitions()
        // Load saved views from DB
        getSavedViews().then(views => {
            setSavedViews(views)
            // Apply active view filters
            const activeId = localStorage.getItem(ACTIVE_VIEW_KEY)
            if (activeId) {
                const view = views.find(v => v.id === activeId)
                if (view) {
                    setSearchQuery(view.search_query)
                    setSelectedTags(view.selected_tags)
                    setExcludedTags(view.excluded_tags || [])
                    setStatusFilter(view.status_filter)
                    setShowTestOnly(view.show_test_only)
                    setLastEmailedSort(view.last_emailed_sort as "asc" | "desc" | null)
                    setActiveViewId(view.id)
                }
            }
        })
    }, [])

    const applyView = (view: SavedView) => {
        setSearchQuery(view.search_query)
        setSelectedTags(view.selected_tags)
        setExcludedTags(view.excluded_tags || [])
        setStatusFilter(view.status_filter)
        setShowTestOnly(view.show_test_only)
        setLastEmailedSort(view.last_emailed_sort as "asc" | "desc" | null)
        setActiveViewId(view.id)
        localStorage.setItem(ACTIVE_VIEW_KEY, view.id)
    }

    const clearActiveView = () => {
        setActiveViewId(null)
        localStorage.removeItem(ACTIVE_VIEW_KEY)
    }

    const handleSaveView = async () => {
        if (!newViewName.trim()) return
        const created = await createSavedView({
            name: newViewName.trim(),
            search_query: searchQuery,
            selected_tags: selectedTags,
            excluded_tags: excludedTags,
            status_filter: statusFilter,
            show_test_only: showTestOnly,
            last_emailed_sort: lastEmailedSort,
        })
        if (created) {
            setSavedViews(prev => [...prev, created])
            setActiveViewId(created.id)
            localStorage.setItem(ACTIVE_VIEW_KEY, created.id)
        }
        setNewViewName("")
        setSavingViewName(false)
    }

    const handleDeleteView = async (viewId: string) => {
        const ok = await deleteSavedView(viewId)
        if (ok) {
            setSavedViews(prev => prev.filter(v => v.id !== viewId))
            if (activeViewId === viewId) clearActiveView()
        }
    }

    // Stats
    const stats = useMemo(() => {
        const total = subscribers.length
        const active = subscribers.filter((s) => s.status === "active").length
        const unsubscribed = subscribers.filter((s) => s.status === "unsubscribed").length
        return { total, active, unsubscribed }
    }, [subscribers])

    // Filtered subscribers
    const filteredSubscribers = useMemo(() => {
        const filtered = subscribers.filter((subscriber) => {
            const matchesSearch =
                subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (subscriber.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (subscriber.last_name || "").toLowerCase().includes(searchQuery.toLowerCase())

            const subscriberTags = subscriber.tags || []
            const matchesIncludeTags = selectedTags.length === 0 || selectedTags.some((tag) => subscriberTags.includes(tag))
            const matchesExcludeTags = excludedTags.length === 0 || !excludedTags.some((tag) => subscriberTags.includes(tag))

            const matchesTest = !showTestOnly || subscriberTags.includes("Test Account")

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(subscriber.status)

            const matchesNeverEmailed = !neverEmailedFilter || !lastSentSubjects[subscriber.id]

            return matchesSearch && matchesIncludeTags && matchesExcludeTags && matchesTest && matchesStatus && matchesNeverEmailed
        })

        if (lastEmailedSort) {
            filtered.sort((a, b) => {
                const aDate = lastSentSubjects[a.id]?.sentAt
                const bDate = lastSentSubjects[b.id]?.sentAt
                // Never-emailed: top when ascending (oldest first), bottom when descending
                if (!aDate && !bDate) return 0
                if (!aDate) return lastEmailedSort === "asc" ? -1 : 1
                if (!bDate) return lastEmailedSort === "asc" ? 1 : -1
                const diff = new Date(aDate).getTime() - new Date(bDate).getTime()
                return lastEmailedSort === "asc" ? diff : -diff
            })
        }

        return filtered
    }, [subscribers, searchQuery, selectedTags, excludedTags, showTestOnly, statusFilter, lastEmailedSort, lastSentSubjects, neverEmailedFilter])

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedTags, excludedTags, showTestOnly, statusFilter, neverEmailedFilter, pageSize])

    // Paginated slice
    const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / pageSize))
    const paginatedSubscribers = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredSubscribers.slice(start, start + pageSize)
    }, [filteredSubscribers, currentPage, pageSize])

    // Build tagColors lookup from tag_definitions DB (hex colors)
    const tagColors = useMemo(() => {
        const colors: Record<string, string> = {}
        tagDefinitions.forEach(td => {
            colors[td.name] = td.color
        })
        return colors
    }, [tagDefinitions])

    // Derived unique tags — merge subscriber tags + tag_definitions
    const allTags = useMemo(() => {
        return tagDefinitions.map(td => td.name)
    }, [tagDefinitions])

    const availableTags = useMemo(() => {
        const subscriberTags = new Set<string>()
        subscribers.forEach(sub => sub.tags?.forEach(t => subscriberTags.add(t)))
        // Add all defined tags (from tag_definitions table)
        allTags.forEach(t => subscriberTags.add(t))
        return Array.from(subscriberTags).sort()
    }, [subscribers, allTags])

    const handleIncludeTagToggle = (tag: string) => {
        setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    }

    const handleExcludeTagToggle = (tag: string) => {
        setExcludedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    }

    const handleSelectAll = () => {
        if (selectedIds.length === filteredSubscribers.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredSubscribers.map((s) => s.id))
        }
    }

    const handleSelectOne = (id: string, index: number, shiftKey: boolean) => {
        if (shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index)
            const end = Math.max(lastSelectedIndex, index)
            const rangeIds = filteredSubscribers.slice(start, end + 1).map(s => s.id)
            setSelectedIds(prev => {
                const combined = new Set([...prev, ...rangeIds])
                return Array.from(combined)
            })
        } else {
            setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
        }
        setLastSelectedIndex(index)
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
            country: "",
            country_code: "",
            phone_code: "",
            phone_number: "",
            shipping_address1: "",
            shipping_address2: "",
            shipping_city: "",
            shipping_zip: "",
            shipping_province: "",
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
            country: formData.country || "",
            country_code: formData.country_code || "",
            phone_code: formData.phone_code || "",
            phone_number: formData.phone_number || "",
            shipping_address1: formData.shipping_address1 || "",
            shipping_address2: formData.shipping_address2 || "",
            shipping_city: formData.shipping_city || "",
            shipping_zip: formData.shipping_zip || "",
            shipping_province: formData.shipping_province || "",
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
        const { error } = await softDeleteSubscriber(id)

        if (error) {
            toast({
                title: "Error deleting subscriber",
                description: error,
                variant: "destructive",
            })
        } else {
            toast({
                title: "Subscriber deleted",
                description: "The subscriber has been removed.",
            })
            setSubscribers((prev) => prev.filter((s) => s.id !== id))
            setSelectedIds((prev) => prev.filter((i) => i !== id))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return

        const { error } = await bulkSoftDeleteSubscribers(selectedIds)

        if (error) {
            toast({
                title: "Error deleting subscribers",
                description: error,
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

    const confirmDelete = (id: string) => {
        setSubscriberToDelete(id)
        setIsDeleteAlertOpen(true)
    }

    const handleConfirmDelete = () => {
        if (subscriberToDelete) {
            handleDelete(subscriberToDelete)
            setSubscriberToDelete(null)
            setIsDeleteAlertOpen(false)
        } else {
            handleBulkDelete()
        }
    }

    const handleAddTag = (tagToAdd: string) => {
        const tag = tagToAdd.trim()
        const currentTags = formData.tags || []
        if (tag && !currentTags.includes(tag)) {
            setFormData({ ...formData, tags: [...currentTags, tag] })
            setNewTag("")
            setTagComboboxOpen(false)
        }
    }

    const handleRemoveTag = (tagToRemove: string) => {
        const currentTags = formData.tags || []
        setFormData({ ...formData, tags: currentTags.filter((tag) => tag !== tagToRemove) })
    }

    const handleSendToSubscriber = async (subscriber: Subscriber) => {
        try {
            const name = subscriber.first_name
                ? `${subscriber.first_name} ${subscriber.last_name || ''}`.trim()
                : ''

            const result = await createCampaignForSubscriber(subscriber.id, subscriber.email, name)

            if (result.error) {
                throw new Error(result.error)
            }

            toast({
                title: "Personal Campaign Created",
                description: `Draft for ${subscriber.email} created. Redirecting...`,
            })

            if (result.data?.id) {
                router.push(`/editor?id=${result.data.id}`)
            }
        } catch (error: any) {
            toast({
                title: "Error creating campaign",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    const handleOpenSelectCampaign = async (subscriber: Subscriber) => {
        setTargetSubscriber(subscriber)
        setIsSelectCampaignOpen(true)
        setLoadingCampaigns(true)

        try {
            const campaigns = await getCampaignList()
            setExistingCampaigns((campaigns as Campaign[]).filter(c => c.is_template === true))
        } catch (error) {
            console.error("Failed to load campaigns", error)
            toast({ title: "Error loading campaigns", variant: "destructive" })
        } finally {
            setLoadingCampaigns(false)
        }
    }

    const handleSelectCampaign = async (campaign: Campaign) => {
        // Bulk send mode — create campaign locked to selected subscribers and redirect
        if (bulkSendMode) {
            setDuplicating(true)
            try {
                const result = await createBulkCampaign(campaign.id, selectedIds)

                if (result.error) {
                    throw new Error(result.error)
                }

                toast({
                    title: "Bulk Campaign Created",
                    description: `Created "${campaign.name}" for ${selectedIds.length} subscribers. Redirecting to manage...`,
                })

                setIsSelectCampaignOpen(false)
                setSelectedIds([])
                setBulkSendMode(false)

                if (result.data?.id) {
                    router.push(`/dashboard/${result.data.id}`)
                }
            } catch (error: any) {
                toast({
                    title: "Error creating bulk campaign",
                    description: error.message,
                    variant: "destructive",
                })
            } finally {
                setDuplicating(false)
            }
            return
        }

        // Individual mode — duplicate for single subscriber
        if (!targetSubscriber) return

        setDuplicating(true)
        try {
            const name = targetSubscriber.first_name
                ? `${targetSubscriber.first_name} ${targetSubscriber.last_name || ''}`.trim()
                : targetSubscriber.email

            const result = await duplicateCampaignForSubscriber(campaign.id, targetSubscriber.id, name)

            if (result.error) {
                throw new Error(result.error)
            }

            toast({
                title: "Campaign Duplicated",
                description: `Created copy of "${campaign.name}" for ${targetSubscriber.email}. Redirecting...`,
            })

            if (result.data?.id) {
                router.push(`/dashboard/${result.data.id}`)
            }
            setIsSelectCampaignOpen(false)
        } catch (error: any) {
            toast({
                title: "Error duplicating campaign",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setDuplicating(false)
        }
    }

    const handleOpenBulkSend = async () => {
        setBulkSendMode(true)
        setTargetSubscriber(null)
        setIsSelectCampaignOpen(true)
        setLoadingCampaigns(true)

        try {
            const campaigns = await getCampaignList()
            setExistingCampaigns((campaigns as Campaign[]).filter(c => c.is_template === true))
        } catch (error) {
            console.error("Failed to load campaigns", error)
            toast({ title: "Error loading campaigns", variant: "destructive" })
        } finally {
            setLoadingCampaigns(false)
        }
    }

    const handleOpenChainPicker = async (subscriber: Subscriber) => {
        setChainTarget(subscriber)
        setIsChainPickerOpen(true)
        setLoadingChains(true)
        try {
            const { data } = await getChains()
            setAvailableChains(data || [])
        } catch (error) {
            console.error("Failed to load chains", error)
            toast({ title: "Error loading chains", variant: "destructive" })
        } finally {
            setLoadingChains(false)
        }
    }

    const handleStartChain = async (chain: ChainRow) => {
        if (!chainTarget) return
        setStartingChain(true)
        try {
            const result = await startChainProcess(chainTarget.id, chain.id)
            if (!result.success) {
                throw new Error(result.error || "Failed to start chain")
            }
            toast({
                title: "Chain Started",
                description: `"${chain.name}" is now running for ${chainTarget.email}`,
            })
            setIsChainPickerOpen(false)
        } catch (error: any) {
            toast({
                title: "Error starting chain",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setStartingChain(false)
        }
    }

    // Bulk add subscribers from textarea (one email per line)
    const handleBulkAdd = async () => {
        const emails = bulkEmails
            .split(/[\n,;]+/)
            .map(e => e.trim().toLowerCase())
            .filter(e => e && e.includes("@"))

        if (emails.length === 0) {
            toast({ title: "No valid emails found", variant: "destructive" })
            return
        }

        const unique = [...new Set(emails)]
        setBulkAdding(true)

        const rows = unique.map(email => ({
            email,
            first_name: "",
            last_name: "",
            country: "",
            country_code: "",
            phone_code: "",
            phone_number: "",
            shipping_address1: "",
            shipping_address2: "",
            shipping_city: "",
            shipping_zip: "",
            shipping_province: "",
            tags: [],
            status: "active" as const,
        }))

        const { error } = await supabase.from("subscribers").upsert(rows, { onConflict: "email", ignoreDuplicates: true })

        if (error) {
            toast({ title: "Error adding subscribers", description: error.message, variant: "destructive" })
        } else {
            toast({ title: `${unique.length} subscribers added`, description: "Duplicates were skipped." })
            setIsBulkAddOpen(false)
            setBulkEmails("")
            fetchSubscribers()
        }
        setBulkAdding(false)
    }

    // CSV Import - parse file and show preview
    const handleCsvFileSelect = (file: File) => {
        setCsvFile(file)
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            const lines = text.split(/\r?\n/).filter(l => l.trim())
            if (lines.length === 0) return

            const parseLine = (line: string): string[] => {
                const result: string[] = []
                let current = ""
                let inQuotes = false
                for (const char of line) {
                    if (char === '"') { inQuotes = !inQuotes }
                    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = "" }
                    else { current += char }
                }
                result.push(current.trim())
                return result
            }

            const headers = parseLine(lines[0])
            setCsvHeaders(headers)
            const rows = lines.slice(1, 6).map(parseLine)
            setCsvPreview(rows)
        }
        reader.readAsText(file)
    }

    // CSV Import - smart merge upsert
    // - New emails: inserted with defaults
    // - Existing emails: only non-blank CSV fields overwrite; blank cells preserve existing data
    // - Tags: merged additively (CSV tags are added to existing tags)
    const handleCsvImport = async () => {
        if (!csvFile) return
        setCsvImporting(true)

        const reader = new FileReader()
        reader.onload = async (e) => {
            const text = e.target?.result as string
            const lines = text.split(/\r?\n/).filter(l => l.trim())
            if (lines.length < 2) {
                toast({ title: "CSV has no data rows", variant: "destructive" })
                setCsvImporting(false)
                return
            }

            const parseLine = (line: string): string[] => {
                const result: string[] = []
                let current = ""
                let inQuotes = false
                for (const char of line) {
                    if (char === '"') { inQuotes = !inQuotes }
                    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = "" }
                    else { current += char }
                }
                result.push(current.trim())
                return result
            }

            const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"))
            const emailIdx = headers.findIndex(h => h === "email" || h === "email_address" || h === "e-mail")
            if (emailIdx === -1) {
                toast({ title: "No 'email' column found in CSV", description: "First row must contain headers with an 'email' column.", variant: "destructive" })
                setCsvImporting(false)
                return
            }

            // Map common column names to our fields
            const idxMap: Record<string, number> = {}
            headers.forEach((h, i) => {
                if (h === "first_name" || h === "fname" || h === "first" || h === "firstname") idxMap["first_name"] = i
                if (h === "last_name" || h === "lname" || h === "last" || h === "lastname") idxMap["last_name"] = i
                if (h === "country") idxMap["country"] = i
                if (h === "country_code") idxMap["country_code"] = i
                if (h === "phone_code") idxMap["phone_code"] = i
                if (h === "phone" || h === "phone_number" || h === "tel") idxMap["phone_number"] = i
                if (h === "address" || h === "address_1" || h === "address1" || h === "shipping_address1") idxMap["shipping_address1"] = i
                if (h === "address_2" || h === "address2" || h === "shipping_address2") idxMap["shipping_address2"] = i
                if (h === "city" || h === "shipping_city") idxMap["shipping_city"] = i
                if (h === "zip" || h === "postal_code" || h === "zipcode" || h === "zip_code" || h === "shipping_zip") idxMap["shipping_zip"] = i
                if (h === "state" || h === "province" || h === "region" || h === "shipping_province") idxMap["shipping_province"] = i
                if (h === "tags" || h === "tag") idxMap["tags"] = i
                if (h === "status") idxMap["status"] = i
            })

            const rows = lines.slice(1).map(parseLine).filter(row => row[emailIdx]?.includes("@"))

            // Build raw parsed rows (keep blanks as empty strings so we know what to skip)
            const mergeFields = ["first_name", "last_name", "country", "country_code", "phone_code", "phone_number", "shipping_address1", "shipping_address2", "shipping_city", "shipping_zip", "shipping_province"] as const
            type MergeField = typeof mergeFields[number]

            const csvRows = rows.map(row => {
                const rawTags = (row[idxMap["tags"]] || "").trim()
                const rawStatus = (row[idxMap["status"]] || "").trim().toLowerCase()
                const parsed: Record<string, string | string[]> = {
                    email: row[emailIdx].toLowerCase().trim(),
                }
                for (const f of mergeFields) {
                    const val = idxMap[f] !== undefined ? (row[idxMap[f]] || "").trim() : ""
                    parsed[f] = f === "shipping_zip" ? val.replace(/'/g, "") : val
                }
                parsed._tags = rawTags ? rawTags.split(/[;,]+/).map((t: string) => t.trim()).filter(Boolean) : []
                parsed._status = (["active", "inactive", "unsubscribed", "bounced"].includes(rawStatus) ? rawStatus : "")
                return parsed
            })

            // Gather all emails to look up existing records
            const allEmails = csvRows.map(r => r.email as string)

            // Fetch existing subscribers in batches of 500
            const existingMap = new Map<string, any>()
            for (let i = 0; i < allEmails.length; i += 500) {
                const batch = allEmails.slice(i, i + 500)
                const { data } = await supabase
                    .from("subscribers")
                    .select("*")
                    .in("email", batch)
                if (data) {
                    for (const row of data) {
                        existingMap.set(row.email, row)
                    }
                }
            }

            const toInsert: any[] = []
            const toUpdate: { id: string; payload: any }[] = []

            for (const csvRow of csvRows) {
                const email = csvRow.email as string
                const existing = existingMap.get(email)
                const csvTags = csvRow._tags as string[]
                const csvStatus = csvRow._status as string

                if (existing) {
                    // Merge: only overwrite fields where CSV has a non-blank value
                    const updates: Record<string, any> = {}
                    for (const f of mergeFields) {
                        const csvVal = csvRow[f] as string
                        if (csvVal) {
                            updates[f] = csvVal
                        }
                    }
                    // Merge tags additively
                    if (csvTags.length > 0) {
                        const existingTags: string[] = existing.tags || []
                        updates.tags = [...new Set([...existingTags, ...csvTags])]
                    }
                    // Only overwrite status if CSV specifies a valid one
                    if (csvStatus) {
                        updates.status = csvStatus
                    }
                    if (Object.keys(updates).length > 0) {
                        toUpdate.push({ id: existing.id, payload: updates })
                    }
                } else {
                    // New subscriber: insert with defaults for blank fields
                    const newSub: Record<string, any> = { email }
                    for (const f of mergeFields) {
                        newSub[f] = (csvRow[f] as string) || ""
                    }
                    newSub.tags = csvTags
                    newSub.status = csvStatus || "active"
                    toInsert.push(newSub)
                }
            }

            let addedCount = 0
            let updatedCount = 0

            // Insert new subscribers in batches
            for (let i = 0; i < toInsert.length; i += 500) {
                const chunk = toInsert.slice(i, i + 500)
                const { error } = await supabase.from("subscribers").insert(chunk)
                if (error) {
                    toast({ title: "Error inserting new subscribers", description: error.message, variant: "destructive" })
                    setCsvImporting(false)
                    return
                }
                addedCount += chunk.length
            }

            // Update existing subscribers one-by-one (each may have different fields)
            for (const { id, payload } of toUpdate) {
                const { error } = await supabase.from("subscribers").update(payload).eq("id", id)
                if (error) {
                    console.error(`Failed to update subscriber ${id}:`, error.message)
                } else {
                    updatedCount++
                }
            }

            const parts: string[] = []
            if (addedCount > 0) parts.push(`${addedCount} added`)
            if (updatedCount > 0) parts.push(`${updatedCount} updated`)
            const skipped = csvRows.length - addedCount - updatedCount
            if (skipped > 0) parts.push(`${skipped} unchanged`)

            toast({ title: `Import complete`, description: parts.join(", ") + "." })
            setIsCsvImportOpen(false)
            setCsvFile(null)
            setCsvPreview([])
            setCsvHeaders([])
            fetchSubscribers()
            setCsvImporting(false)
        }
        reader.readAsText(csvFile)
    }

    // Bulk tag selected subscribers
    const handleBulkTag = async () => {
        if (bulkTagSelections.length === 0 || selectedIds.length === 0) return
        setBulkTagging(true)

        const selectedSubs = subscribers.filter(s => selectedIds.includes(s.id))
        let updated = 0
        for (const sub of selectedSubs) {
            const existingTags = sub.tags || []
            const merged = [...new Set([...existingTags, ...bulkTagSelections])]
            const { error } = await supabase.from("subscribers").update({ tags: merged }).eq("id", sub.id)
            if (!error) updated++
        }

        toast({ title: `Tagged ${updated} subscribers`, description: `Applied: ${bulkTagSelections.join(", ")}` })
        setBulkTagging(false)
        setIsBulkTagOpen(false)
        setBulkTagSelections([])
        setSelectedIds([])
        fetchSubscribers()
    }

    // Export subscribers as CSV in our import-compatible format
    const handleExportCsv = () => {
        const headers = ["email", "first_name", "last_name", "country", "country_code", "phone_code", "phone_number", "shipping_address1", "shipping_address2", "shipping_city", "shipping_zip", "shipping_province", "tags", "status"]

        const escapeField = (val: string) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return '"' + val.replace(/"/g, '""') + '"'
            }
            return val
        }

        const rows = filteredSubscribers.map(sub => [
            sub.email,
            sub.first_name || "",
            sub.last_name || "",
            sub.country || "",
            sub.country_code || "",
            sub.phone_code || "",
            sub.phone_number || "",
            sub.shipping_address1 || "",
            sub.shipping_address2 || "",
            sub.shipping_city || "",
            sub.shipping_zip || "",
            sub.shipping_province || "",
            (sub.tags || []).join(";"),
            sub.status,
        ].map(escapeField).join(","))

        const csv = [headers.join(","), ...rows].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `subscribers_${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)

        toast({ title: `Exported ${rows.length} subscribers` })
    }

    const allSelected = filteredSubscribers.length > 0 && selectedIds.length === filteredSubscribers.length
    const someSelected = selectedIds.length > 0 && selectedIds.length < filteredSubscribers.length

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                            <Users className="h-5 w-5 text-amber-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Audience Manager</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-2" onClick={handleExportCsv}>
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button variant="secondary" size="sm" className="gap-2" onClick={() => setIsCsvImportOpen(true)}>
                            <FileUp className="h-4 w-4" />
                            Import CSV
                        </Button>
                        <Button variant="secondary" size="sm" className="gap-2" onClick={() => setIsBulkAddOpen(true)}>
                            <UsersRound className="h-4 w-4" />
                            Bulk Add
                        </Button>
                        <Button size="sm" onClick={handleAddSubscriber} className="gap-2 bg-amber-500 text-zinc-900 hover:bg-amber-400">
                            <Plus className="h-4 w-4" />
                            Add Subscriber
                        </Button>
                    </div>
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

            {/* Saved Views Bar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Bookmark className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground font-medium mr-1">Views:</span>

                {savedViews.map((view) => (
                    <div key={view.id} className="group relative">
                        <Button
                            variant={activeViewId === view.id ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-7 text-xs gap-1 pr-1.5",
                                activeViewId === view.id
                                    ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                                    : "border-border bg-transparent"
                            )}
                            onClick={() => {
                                if (activeViewId === view.id) {
                                    clearActiveView()
                                } else {
                                    applyView(view)
                                }
                            }}
                        >
                            <Eye className="h-3 w-3" />
                            {view.name}
                            {activeViewId === view.id && (
                                <X className="h-3 w-3 ml-0.5 opacity-70 hover:opacity-100" onClick={(e) => {
                                    e.stopPropagation()
                                    clearActiveView()
                                }} />
                            )}
                        </Button>
                        <button
                            className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] leading-none"
                            onClick={() => handleDeleteView(view.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}

                {savingViewName ? (
                    <div className="flex items-center gap-1">
                        <Input
                            value={newViewName}
                            onChange={(e) => setNewViewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveView()
                                if (e.key === "Escape") setSavingViewName(false)
                            }}
                            placeholder="View name..."
                            className="h-7 w-32 text-xs bg-card border-border"
                            autoFocus
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={handleSaveView} disabled={!newViewName.trim()}>
                            <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSavingViewName(false)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 border-dashed border-border bg-transparent text-muted-foreground hover:text-foreground"
                        onClick={() => setSavingViewName(true)}
                    >
                        <Plus className="h-3 w-3" />
                        Save Current View
                    </Button>
                )}
            </div>

            {/* Toolbar — Filters & View Toggle */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex flex-wrap items-center gap-3">
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
                                Include Tags
                                {selectedTags.length > 0 && (
                                    <span className="ml-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">
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
                                    onCheckedChange={() => handleIncludeTagToggle(tag)}
                                >
                                    {tag}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 border-border bg-transparent">
                                <FilterX className="h-4 w-4" />
                                Exclude Tags
                                {excludedTags.length > 0 && (
                                    <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                                        {excludedTags.length}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            {allTags.map((tag) => (
                                <DropdownMenuCheckboxItem
                                    key={tag}
                                    checked={excludedTags.includes(tag)}
                                    onCheckedChange={() => handleExcludeTagToggle(tag)}
                                >
                                    {tag}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Status Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 border-border bg-transparent">
                                <UserCheck className="h-4 w-4" />
                                Status
                                {statusFilter.length > 0 && (
                                    <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-zinc-900">
                                        {statusFilter.length}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                            {["active", "inactive", "unsubscribed", "bounced"].map((status) => (
                                <DropdownMenuCheckboxItem
                                    key={status}
                                    checked={statusFilter.includes(status)}
                                    onCheckedChange={() => {
                                        setStatusFilter(prev =>
                                            prev.includes(status)
                                                ? prev.filter(s => s !== status)
                                                : [...prev, status]
                                        )
                                    }}
                                    className="capitalize"
                                >
                                    {status}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant={showTestOnly ? "default" : "outline"}
                        className={cn(
                            "gap-2 border-border",
                            showTestOnly
                                ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                                : "bg-transparent"
                        )}
                        onClick={() => setShowTestOnly(!showTestOnly)}
                    >
                        <FlaskConical className="h-4 w-4" />
                        Test Accounts
                    </Button>

                    <Button
                        variant={neverEmailedFilter ? "default" : "outline"}
                        className={cn(
                            "gap-2 border-border",
                            neverEmailedFilter
                                ? "bg-blue-500 text-white hover:bg-blue-400"
                                : "bg-transparent"
                        )}
                        onClick={() => setNeverEmailedFilter(!neverEmailedFilter)}
                    >
                        <MailX className="h-4 w-4" />
                        Not Yet Emailed
                    </Button>

                    <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "tags")} className="w-[180px]">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="list" className="gap-2">
                                <List className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only">List</span>
                            </TabsTrigger>
                            <TabsTrigger value="tags" className="gap-2">
                                <LayoutGrid className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only">Tags</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Selection Action Bar — separate row to avoid overflow */}
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-border bg-card">
                    <Button variant="ghost" onClick={() => setSelectedIds([])}>
                        Cancel ({selectedIds.length})
                    </Button>
                    <Popover open={isBulkTagOpen} onOpenChange={(open) => { setIsBulkTagOpen(open); if (!open) setBulkTagSelections([]) }}>
                        <PopoverTrigger asChild>
                            <Button variant="secondary" className="gap-2">
                                <Tag className="h-4 w-4" />
                                Bulk Tag
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-3">
                            <div className="space-y-3">
                                <p className="text-sm font-medium">Apply tags to {selectedIds.length} subscribers</p>
                                <div className="max-h-[200px] overflow-y-auto space-y-1">
                                    {allTags.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2">No tags defined yet.</p>
                                    ) : allTags.map(tag => (
                                        <label key={tag} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                                            <Checkbox
                                                checked={bulkTagSelections.includes(tag)}
                                                onCheckedChange={(checked) => {
                                                    setBulkTagSelections(prev =>
                                                        checked ? [...prev, tag] : prev.filter(t => t !== tag)
                                                    )
                                                }}
                                            />
                                            {tag}
                                        </label>
                                    ))}
                                </div>
                                <Button
                                    size="sm"
                                    className="w-full bg-amber-500 text-zinc-900 hover:bg-amber-400"
                                    disabled={bulkTagSelections.length === 0 || bulkTagging}
                                    onClick={handleBulkTag}
                                >
                                    {bulkTagging ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying...</> : `Apply ${bulkTagSelections.length} Tag${bulkTagSelections.length !== 1 ? 's' : ''}`}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="secondary" onClick={handleOpenBulkSend} className="gap-2">
                        <Mail className="h-4 w-4" />
                        Bulk Send
                    </Button>
                    <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Selected
                    </Button>
                </div>
            )}

            {/* Content */}
            {viewMode === "list" && (
                <>
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
                                    <TableHead className="w-[100px]"></TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>
                                        <button
                                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                                            onClick={() => setLastEmailedSort(prev => prev === null ? "desc" : prev === "desc" ? "asc" : null)}
                                        >
                                            Last Emailed
                                            {lastEmailedSort === "desc" ? (
                                                <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                                            ) : lastEmailedSort === "asc" ? (
                                                <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
                                            ) : (
                                                <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                                            )}
                                        </button>
                                    </TableHead>
                                    <TableHead>Added</TableHead>
                                    <TableHead className="w-12">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                            Loading subscribers...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSubscribers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                            No subscribers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSubscribers.map((subscriber) => {
                                        const isExpanded = expandedSubscriberId === subscriber.id
                                        return (
                                            <>
                                                <TableRow
                                                    key={subscriber.id}
                                                    className={cn(
                                                        "border-border cursor-pointer hover:bg-muted/50",
                                                        isExpanded && "bg-muted/30"
                                                    )}
                                                    onClick={() => setExpandedSubscriberId(isExpanded ? null : subscriber.id)}
                                                >
                                                    <TableCell onClick={(e) => { e.stopPropagation(); const idx = filteredSubscribers.indexOf(subscriber); handleSelectOne(subscriber.id, idx, e.shiftKey) }} className="cursor-pointer">
                                                        <Checkbox
                                                            checked={selectedIds.includes(subscriber.id)}
                                                            className="pointer-events-none"
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
                                                                {subscriber.first_name && (
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {subscriber.first_name} {subscriber.last_name}
                                                                    </p>
                                                                )}
                                                                {lastSentSubjects[subscriber.id] && (
                                                                    <p className="text-xs text-muted-foreground/70 italic truncate max-w-[300px]">
                                                                        Last sent: {lastSentSubjects[subscriber.id].subject} · {new Date(lastSentSubjects[subscriber.id].sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(lastSentSubjects[subscriber.id].sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleEdit(subscriber)
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                <span className="sr-only">Edit</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    confirmDelete(subscriber.id)
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">Delete</span>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(subscriber.tags || []).length > 0 ? (
                                                                (subscriber.tags || []).map((tag) => {
                                                                    const hex = tagColors[tag]
                                                                    return (
                                                                        <Badge
                                                                            key={tag}
                                                                            variant="outline"
                                                                            className="text-xs"
                                                                            style={hex ? {
                                                                                backgroundColor: `${hex}20`,
                                                                                color: hex,
                                                                                borderColor: `${hex}50`,
                                                                            } : undefined}
                                                                        >
                                                                            {tag}
                                                                        </Badge>
                                                                    )
                                                                })
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
                                                    <TableCell className="text-muted-foreground">
                                                        {lastSentSubjects[subscriber.id] ? (
                                                            <>
                                                                <div>{formatDate(lastSentSubjects[subscriber.id].sentAt)}</div>
                                                                <div className="text-[10px] text-muted-foreground/60">
                                                                    {new Date(lastSentSubjects[subscriber.id].sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/40">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        <div>{formatDate(subscriber.created_at)}</div>
                                                        <div className="text-[10px] text-muted-foreground/60">
                                                            {new Date(subscriber.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                                                                    >
                                                                        <Send className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleSendToSubscriber(subscriber)
                                                                    }}>
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Draft New Campaign
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleOpenSelectCampaign(subscriber)
                                                                    }}>
                                                                        <Copy className="mr-2 h-4 w-4" />
                                                                        Send Existing Campaign
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleOpenChainPicker(subscriber)
                                                                    }}>
                                                                        <GitBranch className="mr-2 h-4 w-4" />
                                                                        Start Chain
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <ChevronDown className={cn(
                                                                "h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
                                                                isExpanded && "rotate-180"
                                                            )} />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && (
                                                    <TableRow key={`${subscriber.id}-expanded`} className="border-border bg-muted/20 hover:bg-muted/20">
                                                        <TableCell colSpan={8} className="p-0">
                                                            <div className="px-6 py-4 border-t border-border/50">
                                                                <SubscriberHistoryTimeline subscriberId={subscriber.id} />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Show</span>
                            {[25, 50, 100].map(size => (
                                <Button
                                    key={size}
                                    variant={pageSize === size ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "h-7 px-2.5 text-xs",
                                        pageSize === size
                                            ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                                            : "bg-transparent border-border"
                                    )}
                                    onClick={() => setPageSize(size)}
                                >
                                    {size}
                                </Button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>
                                {filteredSubscribers.length === 0 ? "0" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredSubscribers.length)}`} of {filteredSubscribers.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 bg-transparent border-border"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 bg-transparent border-border"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {
                viewMode === "tags" && (
                    <TagGroupView subscribers={filteredSubscribers} />
                )
            }

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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        placeholder="United States"
                                        className="bg-card"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="countryCode">Country Code</Label>
                                    <Input
                                        id="countryCode"
                                        value={formData.country_code}
                                        onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                                        placeholder="US"
                                        maxLength={2}
                                        className="bg-card"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phoneCode">Phone Code</Label>
                                    <Input
                                        id="phoneCode"
                                        value={formData.phone_code}
                                        onChange={(e) => {
                                            let val = e.target.value
                                            if (val && !val.startsWith('+')) val = '+' + val
                                            setFormData({ ...formData, phone_code: val })
                                        }}
                                        placeholder="+1"
                                        maxLength={5}
                                        className="bg-card"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="phoneNumber">Phone Number</Label>
                                    <Input
                                        id="phoneNumber"
                                        value={formData.phone_number}
                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value.replace(/[^0-9-() ]/g, '') })}
                                        placeholder="(555) 123-4567"
                                        className="bg-card"
                                    />
                                </div>
                            </div>

                            {/* Shipping Address */}
                            <h3 className="text-sm font-medium text-foreground pt-2">Shipping Address</h3>

                            <div className="space-y-2">
                                <Label htmlFor="shippingAddress1">Address Line 1</Label>
                                <Input
                                    id="shippingAddress1"
                                    value={formData.shipping_address1}
                                    onChange={(e) => setFormData({ ...formData, shipping_address1: e.target.value })}
                                    placeholder="123 Main St"
                                    className="bg-card"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="shippingAddress2">Address Line 2</Label>
                                <Input
                                    id="shippingAddress2"
                                    value={formData.shipping_address2}
                                    onChange={(e) => setFormData({ ...formData, shipping_address2: e.target.value })}
                                    placeholder="Apt 4B"
                                    className="bg-card"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="shippingCity">City</Label>
                                    <Input
                                        id="shippingCity"
                                        value={formData.shipping_city}
                                        onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })}
                                        placeholder="New York"
                                        className="bg-card"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shippingProvince">Province / State</Label>
                                    <Input
                                        id="shippingProvince"
                                        value={formData.shipping_province}
                                        onChange={(e) => setFormData({ ...formData, shipping_province: e.target.value })}
                                        placeholder="NY"
                                        className="bg-card"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shippingZip">Zip / Postal</Label>
                                    <Input
                                        id="shippingZip"
                                        value={formData.shipping_zip}
                                        onChange={(e) => setFormData({ ...formData, shipping_zip: e.target.value })}
                                        placeholder="10001"
                                        className="bg-card"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <div className="flex gap-2">
                                    {['active', 'inactive', 'unsubscribed', 'bounced'].map((s) => (
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

                            <div className="flex gap-2 items-start">
                                <Popover open={tagComboboxOpen} onOpenChange={setTagComboboxOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={tagComboboxOpen}
                                            className="justify-between w-full bg-card"
                                        >
                                            Add a tag...
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0" align="start">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search tags..."
                                                value={newTag}
                                                onValueChange={setNewTag}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && newTag.trim()) {
                                                        e.preventDefault()
                                                        handleAddTag(newTag)
                                                    }
                                                }}
                                            />
                                            <CommandList className="max-h-[200px] overflow-y-auto">
                                                <CommandEmpty>
                                                    <button
                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                                        onClick={() => handleAddTag(newTag)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Create "{newTag}"
                                                    </button>
                                                </CommandEmpty>
                                                <CommandGroup heading="Existing Tags">
                                                    {availableTags.map((tag) => (
                                                        <CommandItem
                                                            key={tag}
                                                            value={tag}
                                                            onSelect={(currentValue) => {
                                                                handleAddTag(currentValue)
                                                            }}
                                                            className="cursor-pointer"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    (formData.tags || []).includes(tag) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {tag}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(formData.tags || []).length > 0 ? (
                                    (formData.tags || []).map((tag) => {
                                        const hex = tagColors[tag]
                                        return (
                                            <Badge
                                                key={tag}
                                                variant="outline"
                                                className="text-xs pr-1"
                                                style={hex ? {
                                                    backgroundColor: `${hex}20`,
                                                    color: hex,
                                                    borderColor: `${hex}50`,
                                                } : undefined}
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
                                        )
                                    })

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
                            This action cannot be undone. This will permanently delete {subscriberToDelete
                                ? "this subscriber"
                                : `${selectedIds.length} subscriber${selectedIds.length === 1 ? '' : 's'}`
                            }.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSubscriberToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Select Campaign Dialog */}
            <Dialog open={isSelectCampaignOpen} onOpenChange={(open) => { setIsSelectCampaignOpen(open); if (!open) setBulkSendMode(false) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{bulkSendMode ? 'Bulk Send Template' : 'Send Existing Campaign'}</DialogTitle>
                        <DialogDescription>
                            {bulkSendMode
                                ? `Select a template to send to ${selectedIds.length} selected subscriber${selectedIds.length !== 1 ? 's' : ''}.`
                                : `Select a campaign to duplicate and send to ${targetSubscriber?.email}.`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {loadingCampaigns ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : existingCampaigns.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No campaigns found.</p>
                        ) : (
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-2">
                                    {[...existingCampaigns].sort((a, b) => (b.is_ready ? 1 : 0) - (a.is_ready ? 1 : 0)).map(campaign => (
                                        <div
                                            key={campaign.id}
                                            onClick={() => !duplicating && handleSelectCampaign(campaign)}
                                            className={cn(
                                                "p-3 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors",
                                                duplicating && "opacity-50 pointer-events-none"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-sm text-foreground line-clamp-2 break-words">{campaign.name}</h4>
                                                {campaign.subject_line && (
                                                    <p className="text-xs text-muted-foreground/70 italic line-clamp-1">{campaign.subject_line}</p>
                                                )}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs shrink-0",
                                                            campaign.is_template
                                                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                                : campaign.status === 'draft' && "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
                                                            !campaign.is_template && campaign.status === 'active' && "bg-blue-500/10 text-blue-400 border-blue-500/30",
                                                            !campaign.is_template && campaign.status === 'completed' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                        )}
                                                    >
                                                        {campaign.is_template ? "template" : campaign.status}
                                                    </Badge>
                                                    {campaign.is_ready && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                        >
                                                            ready
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-2">
                                                Created: {formatDate(campaign.created_at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Chain Picker Dialog */}
            <Dialog open={isChainPickerOpen} onOpenChange={setIsChainPickerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Start Email Chain</DialogTitle>
                        <DialogDescription>
                            Select a chain to start for {chainTarget?.email}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {loadingChains ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : availableChains.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No chains found. Create one first.</p>
                        ) : (
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-2">
                                    {availableChains.map(chain => (
                                        <div
                                            key={chain.id}
                                            onClick={() => !startingChain && handleStartChain(chain)}
                                            className={cn(
                                                "p-3 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors",
                                                startingChain && "opacity-50 pointer-events-none"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <GitBranch className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                    <h4 className="font-medium text-sm text-foreground">{chain.name}</h4>
                                                </div>
                                                {chain.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{chain.description}</p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground pl-6">
                                                    {chain.chain_steps?.length || 0} steps · {chain.chain_branches?.length || 0} branches
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Add Dialog */}
            <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Bulk Add Subscribers</DialogTitle>
                        <DialogDescription>
                            Paste email addresses below — one per line, or separated by commas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <Textarea
                            value={bulkEmails}
                            onChange={(e) => setBulkEmails(e.target.value)}
                            placeholder={"john@example.com\njane@example.com\nbob@example.com"}
                            rows={10}
                            className="bg-card font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            {bulkEmails.split(/[\n,;]+/).filter(e => e.trim() && e.includes("@")).length} valid emails detected
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsBulkAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkAdd} disabled={bulkAdding} className="bg-amber-500 text-zinc-900 hover:bg-amber-400">
                            {bulkAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : "Add All"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={isCsvImportOpen} onOpenChange={(open) => { setIsCsvImportOpen(open); if (!open) { setCsvFile(null); setCsvPreview([]); setCsvHeaders([]) } }}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Import CSV</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file with subscriber data. The first row must be headers and must include an &quot;email&quot; column.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {!csvFile ? (
                            <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FileUp className="h-10 w-10 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to select a CSV file</span>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleCsvFileSelect(e.target.files[0])}
                                />
                            </label>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileUp className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <span className="text-sm font-medium truncate">{csvFile.name}</span>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => { setCsvFile(null); setCsvPreview([]); setCsvHeaders([]) }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {csvHeaders.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground">{csvHeaders.length}</span> columns detected · Preview (first {csvPreview.length} rows):
                                        </p>
                                        <div className="rounded border border-border overflow-auto max-h-[250px]">
                                            <table className="text-xs">
                                                <thead className="sticky top-0">
                                                    <tr className="border-b border-border bg-muted">
                                                        {csvHeaders.map((h, i) => (
                                                            <th key={i} className="px-2 py-1.5 text-left font-medium text-foreground whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvPreview.map((row, ri) => (
                                                        <tr key={ri} className="border-b border-border last:border-0">
                                                            {csvHeaders.map((_, ci) => (
                                                                <td key={ci} className="px-2 py-1 text-muted-foreground whitespace-nowrap max-w-[120px] truncate">{row[ci] || ""}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCsvImportOpen(false)}>Cancel</Button>
                        <Button onClick={handleCsvImport} disabled={!csvFile || csvImporting} className="bg-amber-500 text-zinc-900 hover:bg-amber-400">
                            {csvImporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : "Import"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
