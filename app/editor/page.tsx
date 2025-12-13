"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { EmailEditor } from "@/components/editor/email-editor"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const DEFAULT_HTML = `<div><img src="{{hero_src}}" class="w-full" /> <h1>{{headline}}</h1></div>`
const DEFAULT_ASSETS = {
    hero_src: "https://via.placeholder.com/600x200",
    headline: "Welcome to the Tournament",
}

function EditorPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { toast } = useToast()
    const supabase = createClient()
    const id = searchParams.get("id")

    const [html, setHtml] = useState(DEFAULT_HTML)
    const [assets, setAssets] = useState<Record<string, string>>(DEFAULT_ASSETS)
    const [name, setName] = useState("Untitled Campaign")
    const [status, setStatus] = useState("draft")
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
                setName(data.name || "Untitled Campaign")
                setStatus(data.status || "draft")
            }
            setLoading(false)
        }

        fetchCampaign()
    }, [id, supabase, toast])

    const executeSave = async (campaignName: string) => {
        setSaving(true)
        const campaignData = {
            name: campaignName,
            html_content: html,
            variable_values: assets,
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
            if (!id && newId) {
                router.replace(`/editor?id=${newId}`)
            }
        }
        setSaving(false)
        setSaveDialogOpen(false)
    }

    const handleSaveClick = () => {
        if (name === "Untitled Campaign") {
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
            <EmailEditor
                html={html}
                assets={assets}
                onHtmlChange={setHtml}
                onAssetsChange={setAssets}
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

export default function EditorPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <EditorPageContent />
        </Suspense>
    )
}
