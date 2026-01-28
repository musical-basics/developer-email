"use client"

import { useEffect, useState } from "react"
import { Save, Brain, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getCompanyContext, saveCompanyContext } from "@/app/actions/settings"

export default function SettingsPage() {
    const [context, setContext] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        getCompanyContext().then((data) => {
            setContext(data)
            setLoading(false)
        })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            await saveCompanyContext(context)
            toast({
                title: "Brain Updated",
                description: "Your AI copilot has been updated with the new context.",
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Loading brain...</div>
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your global application configuration.</p>
            </div>

            <Card className="border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-amber-500" />
                        <CardTitle>AI Company Context</CardTitle>
                    </div>
                    <CardDescription>
                        This is the "System Brain" for your AI Copilot. Anything you write here will be injected
                        into every request, ensuring the AI knows your product, tone, and rules.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        className="min-h-[300px] font-mono text-sm bg-background/50 leading-relaxed"
                        placeholder="e.g. DreamPlay Pianos is a brand focused on..."
                    />

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-amber-500 text-black hover:bg-amber-400">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? "Saving..." : "Save Context"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
