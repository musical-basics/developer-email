"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DndEmailEditor } from "@/components/dnd-editor/dnd-editor"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { saveCampaignBackup } from "@/app/actions/campaigns"
import type { EmailDesign } from "@/lib/dnd-blocks/types"
import { serializeBlocks, deserializeBlocks } from "@/lib/dnd-blocks/types"
import { compileBlocksToHtml } from "@/lib/dnd-blocks/compiler"

const DEFAULT_BLOCKS: EmailDesign = []
const DEFAULT_ASSETS: Record<string, string> = {}

function DndEditorPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { toast } = useToast()
    const supabase = createClient()
    const id = searchParams.get("id")

    const [blocks, setBlocks] = useState<EmailDesign>(DEFAULT_BLOCKS)
    const [assets, setAssets] = useState<Record<string, string>>(DEFAULT_ASSETS)
    const [name, setName] = useState("Untitled DnD Campaign")
    const [status, setStatus] = useState("draft")

    const [subjectLine, setSubjectLine] = useState("")
    const [fromName, setFromName] = useState("Lionel Yu")
    const [fromEmail, setFromEmail] = useState("lionel@email.dreamplaypianos.com")

    const [loading, setLoading] = useState(!!id)
    const [saving, setSaving] = useState(false)
    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [nameInput, setNameInput] = useState("")

    useEffect(() => {
        if (!id) return

        const fetchCampaign = async () => {
            setLoading(true)
            const { data } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", id)
                .single()

            if (data) {
                // Try to parse as DnD blocks
                const parsedBlocks = deserializeBlocks(data.html_content || "")
                if (parsedBlocks) {
                    setBlocks(parsedBlocks)
                } else {
                    // Not a DnD campaign — start with empty blocks
                    setBlocks(DEFAULT_BLOCKS)
                }
                setAssets(data.variable_values || DEFAULT_ASSETS)
                setName(data.name || "Untitled DnD Campaign")
                setStatus(data.status || "draft")
                setSubjectLine(data.subject_line || "")
                if (data.variable_values?.from_name) setFromName(data.variable_values.from_name)
                if (data.variable_values?.from_email) setFromEmail(data.variable_values.from_email)
            }
            setLoading(false)
        }

        fetchCampaign()
    }, [id, supabase])

    const executeSave = async (campaignName: string) => {
        setSaving(true)

        // Store blocks as serialized JSON in html_content
        const blocksJson = serializeBlocks(blocks)
        // Also compile to HTML for compatibility (stored as a backup for sending)
        const compiledHtml = compileBlocksToHtml(blocks)

        const campaignData = {
            name: campaignName,
            subject_line: subjectLine,
            html_content: blocksJson,
            variable_values: {
                ...assets,
                from_name: fromName,
                from_email: fromEmail,
                _compiled_html: compiledHtml, // Store compiled version for send flow
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
            toast({ title: "Error saving campaign", description: error.message, variant: "destructive" })
        } else {
            setName(campaignName)
            toast({ title: "Campaign saved", description: "Your changes have been saved." })

            const savedId = id || newId
            if (savedId) {
                await saveCampaignBackup(
                    savedId,
                    blocksJson,
                    { ...assets, from_name: fromName, from_email: fromEmail },
                    subjectLine
                )
            }

            if (!id && newId) {
                router.replace(`/dnd-editor?id=${newId}`)
            }
        }
        setSaving(false)
        setSaveDialogOpen(false)
    }

    const handleSaveClick = () => {
        if (name === "Untitled DnD Campaign" || !id) {
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
            <DndEmailEditor
                blocks={blocks}
                assets={assets}
                subjectLine={subjectLine}
                fromName={fromName}
                fromEmail={fromEmail}
                onBlocksChange={setBlocks}
                onAssetsChange={setAssets}
                onSubjectChange={setSubjectLine}
                onSenderChange={(field, value) => {
                    if (field === "name") setFromName(value)
                    if (field === "email") setFromEmail(value)
                }}
                campaignName={name}
                onNameChange={setName}
                onSave={handleSaveClick}
            />

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Campaign</DialogTitle>
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

export default function DndEditorPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <DndEditorPageContent />
        </Suspense>
    )
}
