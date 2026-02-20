"use client"

import { useEffect, useState } from "react"
import { Save, Brain, Loader2, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getCompanyContext, saveCompanyContext, getDefaultLinks, saveDefaultLinks, type DefaultLinks } from "@/app/actions/settings"

export default function SettingsPage() {
    const [context, setContext] = useState("")
    const [links, setLinks] = useState<DefaultLinks>({
        unsubscribe_url: "",
        privacy_url: "",
        contact_url: "",
        about_url: "",
        shipping_url: "",
        main_cta_url: "",
        crowdfunding_cta_url: "",
        homepage_url: "",
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savingLinks, setSavingLinks] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        Promise.all([getCompanyContext(), getDefaultLinks()]).then(([ctx, lnk]) => {
            setContext(ctx)
            setLinks(lnk)
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

    const handleSaveLinks = async () => {
        setSavingLinks(true)
        try {
            await saveDefaultLinks(links)
            toast({
                title: "Links Saved",
                description: "Default links updated. The AI copilot will use these in new templates.",
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save links.",
                variant: "destructive",
            })
        } finally {
            setSavingLinks(false)
        }
    }

    const updateLink = (key: keyof DefaultLinks, value: string) => {
        setLinks((prev) => ({ ...prev, [key]: value }))
    }

    if (loading) {
        return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Loading settings...</div>
    }

    const linkFields: { key: keyof DefaultLinks; label: string; placeholder: string; group: "footer" | "cta" }[] = [
        { key: "unsubscribe_url", label: "Unsubscribe", placeholder: "https://example.com/unsubscribe?id={{subscriber_id}}", group: "footer" },
        { key: "privacy_url", label: "Privacy Policy", placeholder: "https://example.com/privacy", group: "footer" },
        { key: "contact_url", label: "Contact Us", placeholder: "https://example.com/contact", group: "footer" },
        { key: "about_url", label: "About Us", placeholder: "https://example.com/about", group: "footer" },
        { key: "shipping_url", label: "Shipping", placeholder: "https://example.com/shipping", group: "footer" },
        { key: "main_cta_url", label: "Main CTA", placeholder: "https://example.com/product", group: "cta" },
        { key: "crowdfunding_cta_url", label: "Crowdfunding CTA", placeholder: "https://example.com/crowdfunding", group: "cta" },
        { key: "homepage_url", label: "Homepage", placeholder: "https://example.com", group: "cta" },
    ]

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your global application configuration.</p>
            </div>

            {/* AI Company Context */}
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

            {/* Default Links */}
            <Card className="border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-blue-500" />
                        <CardTitle>Default Links</CardTitle>
                    </div>
                    <CardDescription>
                        Common links the AI copilot will auto-fill when generating new email templates.
                        CTA links go into buttons and image links. Footer links go into the email footer.
                        These are defaults — you can always override them per template.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* CTA Links */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-blue-400 uppercase tracking-wider">CTA & Image Links</h4>
                        <div className="grid gap-3">
                            {linkFields.filter(f => f.group === "cta").map((field) => (
                                <div key={field.key} className="space-y-1">
                                    <Label htmlFor={field.key} className="text-xs text-muted-foreground">{field.label}</Label>
                                    <Input
                                        id={field.key}
                                        value={links[field.key]}
                                        onChange={(e) => updateLink(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="bg-background/50 text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Links */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-blue-400 uppercase tracking-wider">Footer Links</h4>
                        <div className="grid gap-3">
                            {linkFields.filter(f => f.group === "footer").map((field) => (
                                <div key={field.key} className="space-y-1">
                                    <Label htmlFor={field.key} className="text-xs text-muted-foreground">{field.label}</Label>
                                    <Input
                                        id={field.key}
                                        value={links[field.key]}
                                        onChange={(e) => updateLink(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="bg-background/50 text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveLinks} disabled={savingLinks} className="gap-2 bg-blue-500 text-white hover:bg-blue-400">
                            {savingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {savingLinks ? "Saving..." : "Save Links"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
