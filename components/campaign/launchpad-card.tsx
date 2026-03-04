"use client"

import { useState } from "react"
import { Rocket, AlertTriangle, CalendarClock, X, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface LaunchpadCardProps {
    subscriberCount: number
    onLaunch: () => void
    onSchedule: (date: Date) => void
    onCancelSchedule: () => void
    isDisabled?: boolean
    scheduledAt?: string | null
    scheduledStatus?: string | null
}

export function LaunchpadCard({
    subscriberCount,
    onLaunch,
    onSchedule,
    onCancelSchedule,
    isDisabled,
    scheduledAt,
    scheduledStatus,
}: LaunchpadCardProps) {
    const [showSchedulePicker, setShowSchedulePicker] = useState(false)
    const [scheduleDate, setScheduleDate] = useState("")
    const [scheduleTime, setScheduleTime] = useState("")

    const isScheduled = scheduledAt && scheduledStatus === "pending"

    // Get minimum date/time (now + 5 minutes)
    const getMinDateTime = () => {
        const min = new Date(Date.now() + 5 * 60 * 1000)
        return {
            date: min.toISOString().split("T")[0],
            time: min.toTimeString().slice(0, 5),
        }
    }

    const handleScheduleSubmit = () => {
        if (!scheduleDate || !scheduleTime) return
        const dt = new Date(`${scheduleDate}T${scheduleTime}`)
        if (dt <= new Date()) return
        onSchedule(dt)
        setShowSchedulePicker(false)
        setScheduleDate("")
        setScheduleTime("")
    }

    const formatScheduledTime = (isoString: string) => {
        const d = new Date(isoString)
        return d.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
    }

    return (
        <Card className="border-2 border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/5 to-transparent">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <Rocket className="h-5 w-5 text-[#D4AF37]" />
                    The Launchpad
                </CardTitle>
                <CardDescription className="text-muted-foreground">Danger Zone — This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <p className="text-sm text-muted-foreground">
                        You are about to send this campaign to{" "}
                        <span className="font-semibold text-foreground">
                            {subscriberCount === 1 ? "1 subscriber" : `${subscriberCount.toLocaleString()} subscribers`}
                        </span>.
                        Please review everything before launching.
                    </p>
                </div>

                {/* Scheduled indicator */}
                {isScheduled && (
                    <div className="flex items-center justify-between rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-sky-400" />
                            <div>
                                <p className="text-sm font-medium text-sky-300">Scheduled</p>
                                <p className="text-xs text-muted-foreground">{formatScheduledTime(scheduledAt!)}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancelSchedule}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Action buttons */}
                {!isScheduled && (
                    <div className="flex gap-2">
                        <Button
                            onClick={onLaunch}
                            disabled={isDisabled}
                            className="flex-1 gap-2 bg-[#D4AF37] text-[#050505] hover:bg-[#b8962e] disabled:opacity-50"
                            size="lg"
                        >
                            <Rocket className="h-5 w-5" />
                            Send Now
                        </Button>
                        <Button
                            onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                            disabled={isDisabled}
                            variant="outline"
                            size="lg"
                            className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        >
                            <CalendarClock className="h-5 w-5" />
                            Schedule
                        </Button>
                    </div>
                )}

                {/* Schedule picker */}
                {showSchedulePicker && !isScheduled && (
                    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                        <p className="text-sm font-medium text-foreground">Pick a date and time</p>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={scheduleDate}
                                min={getMinDateTime().date}
                                onChange={e => setScheduleDate(e.target.value)}
                                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#D4AF37]"
                            />
                            <input
                                type="time"
                                value={scheduleTime}
                                onChange={e => setScheduleTime(e.target.value)}
                                className="w-32 bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#D4AF37]"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleScheduleSubmit}
                                disabled={!scheduleDate || !scheduleTime}
                                className="flex-1 gap-2 bg-sky-600 text-white hover:bg-sky-500"
                                size="sm"
                            >
                                <CalendarClock className="h-4 w-4" />
                                Confirm Schedule
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSchedulePicker(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {isDisabled && !isScheduled && (
                    <p className="text-center text-sm text-muted-foreground">This campaign has already been sent.</p>
                )}
            </CardContent>
        </Card>
    )
}
