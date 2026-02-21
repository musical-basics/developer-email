"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ModularEmailEditor } from "@/components/editor/modular-email-editor"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { saveCampaignBackup } from "@/app/actions/campaigns"
import { getCampaignDossier } from "@/app/actions/audience-intelligence"

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
    <style>body { font-family: sans-serif; }</style>
</head>
<body>
    <div style="padding: 20px; background: #f0f0f0;">
        <h1>Welcome to Modular Mode</h1>
        <p>This is a separate test environment.</p>
    </div>
</body>
</html>`

const DEFAULT_ASSETS = {}

function ModularEditorPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { toast } = useToast()
    const supabase = createClient()
    const id = searchParams.get("id")

    const [html, setHtml] = useState(DEFAULT_HTML)
    const [assets, setAssets] = useState<Record<string, string>>(DEFAULT_ASSETS)
    const [name, setName] = useState("Untitled Modular Campaign")
    const [status, setStatus] = useState("draft")

    // NEW: Campaign Settings
    const [subjectLine, setSubjectLine] = useState("")
    const [fromName, setFromName] = useState("Lionel Yu")
    const [fromEmail, setFromEmail] = useState("lionel@email.dreamplaypianos.com")
    const [audienceContext, setAudienceContext] = useState<"dreamplay" | "musicalbasics" | "both">("dreamplay")
    const [aiDossier, setAiDossier] = useState("")

    const [loading, setLoading] = useState(!!id)
    const [saving, setSaving] = useState(false)

    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [nameInput, setNameInput] = useState("")

    useEffect(() => {
        if (!id) return

        const fetchCampaign = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", id)
                .single()

            if (data) {
                setHtml(data.html_content || DEFAULT_HTML)
                setAssets(data.variable_values || DEFAULT_ASSETS)
                setName(data.name || "Untitled Modular Campaign")
                setStatus(data.status || "draft")

                // Load Settings
                setSubjectLine(data.subject_line || "")
                if (data.variable_values?.from_name) setFromName(data.variable_values.from_name)
                if (data.variable_values?.from_email) setFromEmail(data.variable_values.from_email)
                if (data.variable_values?.audience_context) setAudienceContext(data.variable_values.audience_context)
            }
            setLoading(false)
        }

        fetchCampaign()
    }, [id, supabase, toast])

    const executeSave = async (campaignName: string) => {
        setSaving(true)
        const campaignData = {
            name: campaignName,
            subject_line: subjectLine, // Save to column
            html_content: html,
            // Save sender info to variable_values (merged with assets)
            variable_values: {
                ...assets,
                from_name: fromName,
                from_email: fromEmail,
                audience_context: audienceContext
            },
            status: status,
        }

        let error
        let newId = id

        if (id) {
            const { error: updateError } = await supabase
                .from("campaigns")
                .update(campaignData)
                .eq("id", id)
            error = updateError
        } else {
            const { data, error: insertError } = await supabase
                .from("campaigns")
                .insert([campaignData])
                .select()
                .single()

            error = insertError
            if (data) newId = data.id
        }

        if (error) {
            toast({
                title: "Error saving campaign",
                description: error.message,
                variant: "destructive",
            })
        } else {
            setName(campaignName)
            toast({
                title: "Campaign saved",
                description: "Your changes have been saved successfully.",
            })

            // Save backup for version history
            const savedId = id || newId
            if (savedId) {
                await saveCampaignBackup(
                    savedId,
                    html,
                    { ...assets, from_name: fromName, from_email: fromEmail },
                    subjectLine
                )
            }

            if (!id && newId) {
                router.replace(`/modular-editor?id=${newId}`)
            }
        }
        setSaving(false)
        setSaveDialogOpen(false)
    }

    const handleSaveClick = () => {
        if (name === "Untitled Modular Campaign" || !id) {
            setNameInput(name)
            setSaveDialogOpen(true)
        } else {
            executeSave(name)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <p>Loading campaign...</p>
            </div>
        )
    }

    return (
        <main className="h-screen w-screen">
            <ModularEmailEditor
                html={html}
                assets={assets}
                subjectLine={subjectLine}
                fromName={fromName}
                fromEmail={fromEmail}
                audienceContext={audienceContext}
                aiDossier={aiDossier}
                onHtmlChange={setHtml}
                onAssetsChange={setAssets}
                onSubjectChange={setSubjectLine}
                onSenderChange={(field, value) => {
                    if (field === "name") setFromName(value)
                    if (field === "email") setFromEmail(value)
                }}
                onAudienceChange={setAudienceContext}
                campaignName={name}
                onNameChange={setName}
                onSave={handleSaveClick}
                campaignId={id}
                onRestore={(backup) => {
                    setHtml(backup.html_content || DEFAULT_HTML)
                    setAssets(backup.variable_values || DEFAULT_ASSETS)
                    setSubjectLine(backup.subject_line || "")
                    if (backup.variable_values?.from_name) setFromName(backup.variable_values.from_name)
                    if (backup.variable_values?.from_email) setFromEmail(backup.variable_values.from_email)
                    toast({ title: "Version restored", description: "Campaign reverted to saved version." })
                }}
            />

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Modular Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Campaign Name</Label>
                            <Input
                                id="name"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="Enter campaign name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => executeSave(nameInput)} disabled={saving}>
                            {saving ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}

export default function ModularPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <ModularEditorPageContent />
        </Suspense>
    )
}
