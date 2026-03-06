"use client"

import { TicketPercent, CheckCircle2, AlertCircle, Link2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface DiscountAuditCardProps {
    variableValues: Record<string, any> | null
}

export function DiscountAuditCard({ variableValues }: DiscountAuditCardProps) {
    const vars = variableValues || {}
    const discountCode = vars.discount_code
    const presetConfig = vars.discount_preset_config
    const presetId = vars.discount_preset_id
    const isPerUser = !!presetId && !!presetConfig

    // No discount configured — don't render
    if (!discountCode) return null

    // Find all URL variables that have ?discount= attached
    const urlsWithDiscount: { key: string; url: string }[] = []
    const urlsWithoutDiscount: { key: string; url: string }[] = []

    Object.entries(vars).forEach(([key, value]) => {
        if (typeof value !== "string") return
        const keyLower = key.toLowerCase()
        const valueLower = value.toLowerCase()
        // Skip non-URL values
        if (keyLower === "discount_code" || keyLower === "discount_preset_id" || keyLower === "discount_preset_config") return
        if (keyLower.includes("from_") || keyLower.includes("subscriber")) return
        const isUrl = valueLower.startsWith("http") || valueLower.includes(".com") || valueLower.includes(".io")
        const isLinkKey = keyLower.includes("url") || keyLower.includes("link") || keyLower.includes("cta") || keyLower.includes("href")
        if (!isUrl && !isLinkKey) return

        if (value.includes("discount=")) {
            urlsWithDiscount.push({ key, url: value })
        } else {
            urlsWithoutDiscount.push({ key, url: value })
        }
    })

    const hasIssues = urlsWithDiscount.length === 0

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <TicketPercent className="h-5 w-5 text-emerald-400" />
                    Discount Audit
                    {hasIssues ? (
                        <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                            No Links
                        </span>
                    ) : (
                        <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                            Active
                        </span>
                    )}
                </CardTitle>
                <CardDescription className="text-muted-foreground">Discount code and link attachment overview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Code + Mode */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Discount Code</p>
                        <p className="font-mono text-sm font-semibold tracking-wider">{discountCode}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                        <p className="text-xs text-muted-foreground">Mode</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isPerUser ? "bg-violet-500/10 text-violet-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                            {isPerUser ? "Per User (unique codes)" : "Shared Code"}
                        </span>
                    </div>
                </div>

                {/* Preset details (if per-user) */}
                {isPerUser && presetConfig && (
                    <div className="flex items-center gap-3 bg-violet-500/5 rounded px-3 py-2">
                        <Clock className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                        <p className="text-[11px] text-muted-foreground">
                            Each recipient gets a unique <strong className="text-violet-400">{presetConfig.codePrefix}-XXXXXX</strong> code
                            {presetConfig.type === "percentage" ? ` for ${presetConfig.value}% off` : ` for $${presetConfig.value} off`}
                            , valid {presetConfig.durationDays} days, 1 use each.
                        </p>
                    </div>
                )}

                {/* URLs with discount */}
                {urlsWithDiscount.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Discount attached to {urlsWithDiscount.length} link{urlsWithDiscount.length !== 1 ? "s" : ""}
                        </p>
                        {urlsWithDiscount.map(({ key, url }) => (
                            <div key={key} className="text-[11px] bg-emerald-500/5 rounded px-3 py-1.5">
                                <span className="font-mono text-emerald-400">{"{{" + key + "}}"}</span>
                                <p className="text-muted-foreground truncate mt-0.5">{url}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* URLs without discount */}
                {urlsWithoutDiscount.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-muted-foreground/60" />
                            {urlsWithoutDiscount.length} link{urlsWithoutDiscount.length !== 1 ? "s" : ""} without discount
                        </p>
                        {urlsWithoutDiscount.map(({ key, url }) => (
                            <div key={key} className="text-[11px] bg-muted/30 rounded px-3 py-1.5 opacity-60">
                                <span className="font-mono text-muted-foreground">{"{{" + key + "}}"}</span>
                                <p className="text-muted-foreground truncate mt-0.5">{url}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Warning: no URLs have discount */}
                {hasIssues && (
                    <div className="flex items-start gap-2 bg-amber-500/5 rounded px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-amber-500/80">
                            Code <strong>{discountCode}</strong> is set but no URLs have <code className="text-[10px]">?discount=</code> attached.
                            Go back to the editor and use the link picker to apply it.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
