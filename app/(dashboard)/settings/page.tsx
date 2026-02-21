"use client"

import { useEffect, useState } from "react"
import { Save, Brain, Loader2, Link2, Music, Piano, ArrowRightLeft, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getAnthropicModels } from "@/app/actions/ai-models"
import {
    getCompanyContext, saveCompanyContext,
    getDefaultLinks, saveDefaultLinks,
    type DefaultLinks, type AudienceContext, type Brand
} from "@/app/actions/settings"

const LINK_LABELS: Record<keyof DefaultLinks, string> = {
    unsubscribe_url: "Unsubscribe URL",
    privacy_url: "Privacy Policy",
    contact_url: "Contact Us",
    about_url: "About Page",
    shipping_url: "Shipping Info",
    main_cta_url: "Main CTA URL",
    crowdfunding_cta_url: "Crowdfunding CTA",
    homepage_url: "Homepage URL",
}

export default function SettingsPage() {
    // ─── Context State ──────────────────────────────
    const [ctxMusicalBasics, setCtxMusicalBasics] = useState("")
    const [ctxDreamPlay, setCtxDreamPlay] = useState("")
    const [ctxCrossover, setCtxCrossover] = useState("")

    // ─── Links State ────────────────────────────────
    const [linksMB, setLinksMB] = useState<DefaultLinks>({
        unsubscribe_url: "", privacy_url: "", contact_url: "", about_url: "",
        shipping_url: "", main_cta_url: "", crowdfunding_cta_url: "", homepage_url: ""
    })
    const [linksDP, setLinksDP] = useState<DefaultLinks>({
        unsubscribe_url: "", privacy_url: "", contact_url: "", about_url: "",
        shipping_url: "", main_cta_url: "", crowdfunding_cta_url: "", homepage_url: ""
    })

    const [loading, setLoading] = useState(true)
    const [savingContext, setSavingContext] = useState<string | null>(null)
    const [savingLinks, setSavingLinks] = useState<string | null>(null)
    const [defaultModel, setDefaultModel] = useState("auto")
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const { toast } = useToast()

    // ─── Load ───────────────────────────────────────
    useEffect(() => {
        async function loadAll() {
            try {
                const [mb, dp, cross, lMB, lDP] = await Promise.all([
                    getCompanyContext("musicalbasics"),
                    getCompanyContext("dreamplay"),
                    getCompanyContext("crossover"),
                    getDefaultLinks("musicalbasics"),
                    getDefaultLinks("dreamplay"),
                ])
                setCtxMusicalBasics(mb)
                setCtxDreamPlay(dp)
                setCtxCrossover(cross)
                setLinksMB(lMB)
                setLinksDP(lDP)
            } catch (e) {
                console.error("Failed to load settings:", e)
            } finally {
                setLoading(false)
            }
        }
        loadAll()

        // Load default model from localStorage
        const saved = localStorage.getItem("mb_default_model")
        if (saved) setDefaultModel(saved)

        // Fetch available models
        getAnthropicModels().then(models => {
            if (models.length > 0) setAvailableModels(models)
        })
    }, [])

    // ─── Save Handlers ──────────────────────────────
    const handleSaveContext = async (audience: AudienceContext) => {
        setSavingContext(audience)
        try {
            const text = audience === "musicalbasics" ? ctxMusicalBasics
                : audience === "dreamplay" ? ctxDreamPlay : ctxCrossover
            await saveCompanyContext(audience, text)
            toast({ title: "Context Saved", description: `${audience} context updated.` })
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        } finally {
            setSavingContext(null)
        }
    }

    const handleSaveLinks = async (brand: Brand) => {
        setSavingLinks(brand)
        try {
            const links = brand === "musicalbasics" ? linksMB : linksDP
            await saveDefaultLinks(brand, links)
            toast({ title: "Links Saved", description: `${brand} links updated.` })
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        } finally {
            setSavingLinks(null)
        }
    }

    const updateLink = (brand: Brand, key: keyof DefaultLinks, value: string) => {
        if (brand === "musicalbasics") {
            setLinksMB(prev => ({ ...prev, [key]: value }))
        } else {
            setLinksDP(prev => ({ ...prev, [key]: value }))
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure AI context and default links per brand. The AI Copilot uses this data when generating email templates.
                </p>
            </div>
            {/* ─── Default Model Card ─── */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-amber-500" />
                        Default Copilot Model
                    </CardTitle>
                    <CardDescription>
                        This model loads by default every time you open the editor copilot.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={defaultModel}
                        onValueChange={(val) => {
                            setDefaultModel(val)
                            localStorage.setItem("mb_default_model", val)
                            toast({ title: "Default model updated", description: `Copilot will now default to ${val}` })
                        }}
                    >
                        <SelectTrigger className="w-full max-w-md">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="auto">✨ Auto (Smart Routing)</SelectItem>
                            {availableModels.map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Tabs defaultValue="dreamplay" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dreamplay" className="flex items-center gap-2">
                        <Piano className="w-4 h-4" />
                        DreamPlay
                    </TabsTrigger>
                    <TabsTrigger value="musicalbasics" className="flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        MusicalBasics
                    </TabsTrigger>
                    <TabsTrigger value="crossover" className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4" />
                        Crossover
                    </TabsTrigger>
                </TabsList>

                {/* ─── DreamPlay Tab ─── */}
                <TabsContent value="dreamplay" className="space-y-6">
                    <BrandContextCard
                        title="DreamPlay Context"
                        description="Company and product context for the DreamPlay brand."
                        value={ctxDreamPlay}
                        onChange={setCtxDreamPlay}
                        onSave={() => handleSaveContext("dreamplay")}
                        saving={savingContext === "dreamplay"}
                    />
                    <BrandLinksCard
                        title="DreamPlay Links"
                        links={linksDP}
                        onChange={(key, val) => updateLink("dreamplay", key, val)}
                        onSave={() => handleSaveLinks("dreamplay")}
                        saving={savingLinks === "dreamplay"}
                    />
                </TabsContent>

                {/* ─── MusicalBasics Tab ─── */}
                <TabsContent value="musicalbasics" className="space-y-6">
                    <BrandContextCard
                        title="MusicalBasics Context"
                        description="Company and product context for MusicalBasics."
                        value={ctxMusicalBasics}
                        onChange={setCtxMusicalBasics}
                        onSave={() => handleSaveContext("musicalbasics")}
                        saving={savingContext === "musicalbasics"}
                    />
                    <BrandLinksCard
                        title="MusicalBasics Links"
                        links={linksMB}
                        onChange={(key, val) => updateLink("musicalbasics", key, val)}
                        onSave={() => handleSaveLinks("musicalbasics")}
                        saving={savingLinks === "musicalbasics"}
                    />
                </TabsContent>

                {/* ─── Crossover Tab ─── */}
                <TabsContent value="crossover" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                Crossover Context
                            </CardTitle>
                            <CardDescription>
                                This context is injected when the Target Audience is set to &ldquo;Both&rdquo;.
                                Use it to explain to the AI how to bridge your two brands &mdash; for example:
                                &ldquo;The reader originally subscribed for MusicalBasics content, but also has interest in DreamPlay.
                                Focus 80% on music, 20% on the keyboard product. Introduce DreamPlay organically.&rdquo;
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={ctxCrossover}
                                onChange={(e) => setCtxCrossover(e.target.value)}
                                placeholder="Describe the audience hierarchy and how to blend both brands..."
                                rows={8}
                            />
                            <Button
                                onClick={() => handleSaveContext("crossover")}
                                disabled={savingContext === "crossover"}
                            >
                                {savingContext === "crossover" ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Crossover Context
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ─── Sub-components ─────────────────────────────────────

function BrandContextCard({
    title, description, value, onChange, onSave, saving
}: {
    title: string; description: string; value: string
    onChange: (v: string) => void; onSave: () => void; saving: boolean
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Describe your brand, products, tone, and any context the AI should know..."
                    rows={6}
                />
                <Button onClick={onSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Context
                </Button>
            </CardContent>
        </Card>
    )
}

function BrandLinksCard({
    title, links, onChange, onSave, saving
}: {
    title: string; links: DefaultLinks
    onChange: (key: keyof DefaultLinks, value: string) => void
    onSave: () => void; saving: boolean
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-blue-400" />
                    {title}
                </CardTitle>
                <CardDescription>
                    Default URLs the AI Copilot uses when generating templates for this brand.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {(Object.keys(LINK_LABELS) as (keyof DefaultLinks)[]).map((key) => (
                    <div key={key} className="grid grid-cols-3 gap-3 items-center">
                        <Label className="text-sm text-muted-foreground">{LINK_LABELS[key]}</Label>
                        <Input
                            value={links[key]}
                            onChange={(e) => onChange(key, e.target.value)}
                            placeholder={`https://...`}
                            className="col-span-2"
                        />
                    </div>
                ))}
                <Button onClick={onSave} disabled={saving} className="mt-2">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Links
                </Button>
            </CardContent>
        </Card>
    )
}
