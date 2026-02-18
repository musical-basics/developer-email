"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, User, Pencil, Loader2, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Campaign, Subscriber } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export interface Audience {
    total_subscribers: number
    active_subscribers: number
}

interface AudienceCardProps {
    audience: Audience
    campaign?: Campaign
    targetSubscriber?: Subscriber | null
}

export function AudienceCard({ audience, campaign, targetSubscriber }: AudienceCardProps) {
    const lockedSubscriberId = campaign?.variable_values?.subscriber_id
    const { toast } = useToast()
    const router = useRouter()

    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [firstName, setFirstName] = useState(targetSubscriber?.first_name || "")
    const [lastName, setLastName] = useState(targetSubscriber?.last_name || "")
    const [email, setEmail] = useState(targetSubscriber?.email || "")

    const handleSave = async () => {
        if (!lockedSubscriberId) return
        setSaving(true)

        try {
            const res = await fetch("/api/update-subscriber", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscriberId: lockedSubscriberId,
                    campaignId: campaign?.id,
                    firstName,
                    lastName,
                    email,
                }),
            })
            const result = await res.json()

            if (result.error) {
                toast({ title: "Error updating subscriber", description: result.error, variant: "destructive" })
            } else if (result.switched) {
                // Email matched an existing subscriber — campaign was switched to them
                const sub = result.subscriber
                setFirstName(sub.first_name || "")
                setLastName(sub.last_name || "")
                setEmail(sub.email || "")
                toast({
                    title: "Switched to existing subscriber",
                    description: `Matched ${sub.first_name || ""} ${sub.last_name || ""} (${sub.email}). Campaign target updated.`,
                })
                setEditing(false)
                router.refresh()
            } else {
                toast({ title: "Subscriber updated", description: "Destination info saved." })
                setEditing(false)
                router.refresh()
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to update subscriber.", variant: "destructive" })
        }
        setSaving(false)
    }

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <Users className="h-5 w-5 text-[#D4AF37]" />
                    Target Audience
                </CardTitle>
            </CardHeader>
            <CardContent>
                {lockedSubscriberId ? (
                    <div className="flex items-start gap-4 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                        <User className="h-8 w-8 text-blue-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-blue-400">1 Subscriber</p>
                            {editing ? (
                                <div className="mt-2 space-y-2">
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="First name"
                                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                                    />
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Last name"
                                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                                    />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email"
                                        className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                                    />
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                                        >
                                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditing(false)
                                                setFirstName(targetSubscriber?.first_name || "")
                                                setLastName(targetSubscriber?.last_name || "")
                                                setEmail(targetSubscriber?.email || "")
                                            }}
                                            className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded hover:bg-muted/80 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="mt-1 group cursor-pointer"
                                    onClick={() => setEditing(true)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-blue-300">{firstName} {lastName}</p>
                                        <Pencil className="w-3 h-3 text-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-sm text-blue-300/80">{email}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tracking-tight text-foreground">
                                {audience.active_subscribers.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">Active Subscribers</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">All subscribers will receive this campaign when launched.</p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

