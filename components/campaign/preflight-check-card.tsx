import { ShieldCheck, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface CheckItem {
    label: string
    status: "pass" | "warning" | "fail"
    detail?: string
}

interface PreflightCheckCardProps {
    subjectLine: string | null
    htmlContent: string | null
    variableValues: Record<string, any> | null
}

export function PreflightCheckCard({ subjectLine, htmlContent, variableValues }: PreflightCheckCardProps) {
    // Extract Mustache variables from HTML content
    const extractVariables = (html: string): string[] => {
        const regex = /\{\{(\w+)\}\}/g
        const matches = new Set<string>()
        let match
        while ((match = regex.exec(html)) !== null) {
            matches.add(match[1])
        }
        return Array.from(matches)
    }

    const safeHtml = htmlContent || ""
    const safeSubject = subjectLine || ""
    const safeVariables = variableValues || {}

    const detectedVariables = extractVariables(safeHtml)
    const hasUnsubscribeLink =
        safeHtml.toLowerCase().includes("unsubscribe") || safeHtml.includes("{{unsubscribe_url}}")

    // Build checklist items
    const checks: CheckItem[] = [
        {
            label: "Subject Line",
            status: safeSubject && safeSubject.trim().length > 0 ? "pass" : "fail",
            detail: safeSubject ? "Present" : "Missing",
        },
        {
            label: "Unsubscribe Link",
            status: hasUnsubscribeLink ? "pass" : "warning",
            detail: hasUnsubscribeLink ? "Detected" : "Not found",
        },
        {
            label: "Variables",
            status: detectedVariables.length > 0 ? "pass" : "pass",
            detail:
                detectedVariables.length > 0
                    ? `${detectedVariables.length} found (${detectedVariables.map((v) => `{{${v}}}`).join(", ")})`
                    : "None detected",
        },
    ]

    // Check if all variables have values
    const missingValues = detectedVariables.filter((v) => !safeVariables[v] || String(safeVariables[v]).trim() === "")
    if (missingValues.length > 0) {
        checks.push({
            label: "Variable Values",
            status: "warning",
            detail: `Missing: ${missingValues.map((v) => `{{${v}}}`).join(", ")}`,
        })
    }

    const getStatusIcon = (status: CheckItem["status"]) => {
        switch (status) {
            case "pass":
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            case "warning":
                return <AlertCircle className="h-4 w-4 text-amber-500" />
            case "fail":
                return <XCircle className="h-4 w-4 text-red-500" />
        }
    }

    const allPassed = checks.every((c) => c.status === "pass")
    const hasFailures = checks.some((c) => c.status === "fail")

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                    <ShieldCheck className="h-5 w-5 text-[#D4AF37]" />
                    Pre-Flight Check
                    {allPassed && (
                        <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                            All Clear
                        </span>
                    )}
                    {hasFailures && (
                        <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                            Issues Found
                        </span>
                    )}
                </CardTitle>
                <CardDescription className="text-muted-foreground">System check to ensure nothing is broken.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {checks.map((check, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <span className="mt-0.5">{getStatusIcon(check.status)}</span>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{check.label}</span>
                                {check.detail && <span className="text-xs text-muted-foreground">{check.detail}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
