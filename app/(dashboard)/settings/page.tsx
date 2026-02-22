"use client"

import { useEffect, useState } from "react"
import { Save, Brain, Loader2, Link2, Music, Piano, ArrowRightLeft, Bot, Zap, Flame, Cpu, MousePointerClick, Eye } from "lucide-react"
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

    // ─── Tier Model State ────────────────────────────
    const [modelLow, setModelLow] = useState("claude-haiku-4-5-20251001")
    const [modelMedium, setModelMedium] = useState("claude-sonnet-4-6")
    const [modelHigh, setModelHigh] = useState("claude-opus-4-6")
    const [autoRouting, setAutoRouting] = useState(false)
    const [availableModels, setAvailableModels] = useState<string[]>([])

    // ─── Per-Sender Tracking Toggles ─────────────────────
    const senderEmails = ["lionel@musicalbasics.com", "lionel@email.dreamplaypianos.com"] as const
    const [trackingSettings, setTrackingSettings] = useState<Record<string, { click: boolean; open: boolean }>>({
        "lionel@musicalbasics.com": { click: true, open: true },
        "lionel@email.dreamplaypianos.com": { click: true, open: true },
    })
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

        // Load tier models from localStorage
        const savedLow = localStorage.getItem("mb_model_low")
        const savedMed = localStorage.getItem("mb_model_medium")
        const savedHigh = localStorage.getItem("mb_model_high")
        const savedAuto = localStorage.getItem("mb_auto_routing")
        if (savedLow) setModelLow(savedLow)
        if (savedMed) setModelMedium(savedMed)
        if (savedHigh) setModelHigh(savedHigh)
        if (savedAuto === "true") setAutoRouting(true)

        // Load per-sender tracking toggles
        const loaded: Record<string, { click: boolean; open: boolean }> = {}
        for (const email of ["lionel@musicalbasics.com", "lionel@email.dreamplaypianos.com"]) {
            const savedClick = localStorage.getItem(`mb_click_tracking_${email}`)
            const savedOpen = localStorage.getItem(`mb_open_tracking_${email}`)
            loaded[email] = {
                click: savedClick !== null ? savedClick === "true" : true,
                open: savedOpen !== null ? savedOpen === "true" : true,
            }
        }
        setTrackingSettings(loaded)

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
            {/* ─── Copilot Model Tiers Card ─── */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-amber-500" />
                        Copilot Model Tiers
                    </CardTitle>
                    <CardDescription>
                        Assign a model to each compute tier. In the editor, you&apos;ll see 3 colored send buttons (🟢 🟡 🔴) to pick the tier per message.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Auto-Routing Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-amber-400" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Auto Smart Routing</p>
                                <p className="text-xs text-muted-foreground">
                                    When ON, the copilot shows 1 button and automatically picks Low or Medium based on prompt complexity.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const next = !autoRouting
                                setAutoRouting(next)
                                localStorage.setItem("mb_auto_routing", String(next))
                                toast({ title: next ? "Auto-Routing ON" : "Auto-Routing OFF", description: next ? "Copilot will auto-pick between your Low and Medium models." : "You'll see 3 send buttons to manually pick the tier." })
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRouting ? "bg-primary" : "bg-muted-foreground/30"}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRouting ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                    </div>

                    {/* Tier Dropdowns */}
                    {([
                        { key: "low" as const, label: "Low Compute", icon: <Cpu className="w-4 h-4" />, color: "text-green-400", state: modelLow, setter: setModelLow, storageKey: "mb_model_low" },
                        { key: "medium" as const, label: "Medium Compute", icon: <Flame className="w-4 h-4" />, color: "text-amber-400", state: modelMedium, setter: setModelMedium, storageKey: "mb_model_medium" },
                        { key: "high" as const, label: "High Compute", icon: <Zap className="w-4 h-4" />, color: "text-red-400", state: modelHigh, setter: setModelHigh, storageKey: "mb_model_high" },
                    ]).map(tier => (
                        <div key={tier.key} className="grid grid-cols-3 gap-3 items-center">
                            <Label className={`text-sm font-medium flex items-center gap-2 ${tier.color}`}>
                                {tier.icon}
                                {tier.label}
                            </Label>
                            <div className="col-span-2">
                                <Select
                                    value={tier.state}
                                    onValueChange={(val) => {
                                        tier.setter(val)
                                        localStorage.setItem(tier.storageKey, val)
                                        toast({ title: `${tier.label} updated`, description: val })
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableModels.map(model => (
                                            <SelectItem key={model} value={model}>{model}</SelectItem>
                                        ))}
                                        {availableModels.length === 0 && (
                                            <SelectItem value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Legacy)</SelectItem>
                                        )}
                                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ─── Email Tracking Card ─── */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MousePointerClick className="w-5 h-5 text-blue-500" />
                        Email Tracking
                    </CardTitle>
                    <CardDescription>
                        Control which tracking mechanisms are active in outgoing emails.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {senderEmails.map(email => {
                        const label = email.includes("musicalbasics") ? "Musical Basics" : "DreamPlay Pianos"
                        const settings = trackingSettings[email] || { click: true, open: true }
                        const toggleSetting = (field: "click" | "open") => {
                            const next = !settings[field]
                            const newSettings = { ...trackingSettings, [email]: { ...settings, [field]: next } }
                            setTrackingSettings(newSettings)
                            localStorage.setItem(`mb_${field}_tracking_${email}`, String(next))
                            toast({ title: `${field === "click" ? "Click" : "Open"} Tracking ${next ? "ON" : "OFF"} for ${label}` })
                        }
                        return (
                            <div key={email} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${email.includes("musicalbasics") ? "bg-amber-400" : "bg-blue-400"}`} />
                                    <p className="text-sm font-semibold text-foreground">{label}</p>
                                    <span className="text-[10px] text-muted-foreground font-mono">{email}</span>
                                </div>
                                {/* Click Tracking */}
                                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30 ml-4">
                                    <div className="flex items-center gap-3">
                                        <MousePointerClick className="w-4 h-4 text-blue-400" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Click Tracking</p>
                                            <p className="text-xs text-muted-foreground">Rewrite links through <code className="text-xs">/api/track/click</code></p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSetting("click")}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.click ? "bg-primary" : "bg-muted-foreground/30"}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.click ? "translate-x-6" : "translate-x-1"}`} />
                                    </button>
                                </div>
                                {/* Open Tracking */}
                                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30 ml-4">
                                    <div className="flex items-center gap-3">
                                        <Eye className="w-4 h-4 text-purple-400" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Open Tracking</p>
                                            <p className="text-xs text-muted-foreground">Inject a 1×1 tracking pixel for open detection</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSetting("open")}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.open ? "bg-primary" : "bg-muted-foreground/30"}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.open ? "translate-x-6" : "translate-x-1"}`} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
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
