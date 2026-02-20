"use client"

import { useCallback, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Settings, AlignLeft, AlignCenter, AlignRight, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { AssetPickerModal } from "@/components/editor/asset-picker-modal"
import type {
    EmailBlock, BlockType, HeadingProps, TextProps, ImageProps,
    ButtonProps, DividerProps, SpacerProps, SocialProps, SocialNetwork
} from "@/lib/dnd-blocks/types"
import { BLOCK_LABELS } from "@/lib/dnd-blocks/defaults"

interface BlockSettingsProps {
    block: EmailBlock | null
    onUpdate: (id: string, props: Record<string, any>) => void
}

// --- Shared Controls ---

function AlignmentPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex bg-muted p-0.5 rounded-md">
            {(['left', 'center', 'right'] as const).map((a) => {
                const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
                return (
                    <button
                        key={a}
                        onClick={() => onChange(a)}
                        className={cn(
                            "p-1.5 rounded-sm transition-colors flex-1 flex justify-center",
                            value === a ? "bg-background shadow-sm" : "hover:bg-background/50"
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" />
                    </button>
                )
            })}
        </div>
    )
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    return (
        <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 text-xs font-mono flex-1"
                />
            </div>
        </div>
    )
}

function NumberSlider({ value, onChange, label, min, max, step = 1, unit = 'px' }: {
    value: number; onChange: (v: number) => void; label: string
    min: number; max: number; step?: number; unit?: string
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
                <span className="text-xs text-muted-foreground">{value}{unit}</span>
            </div>
            <Slider
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                min={min}
                max={max}
                step={step}
                className="w-full"
            />
        </div>
    )
}

// --- Per-Type Settings ---

function HeadingSettings({ props, onChange }: { props: HeadingProps; onChange: (p: Partial<HeadingProps>) => void }) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Heading Text</Label>
                <Input value={props.text} onChange={(e) => onChange({ text: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Level</Label>
                <Select value={props.level} onValueChange={(v) => onChange({ level: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="h1">H1 - Large</SelectItem>
                        <SelectItem value="h2">H2 - Medium</SelectItem>
                        <SelectItem value="h3">H3 - Small</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Alignment</Label>
                <AlignmentPicker value={props.alignment} onChange={(v) => onChange({ alignment: v as any })} />
            </div>
            <ColorInput value={props.color} onChange={(v) => onChange({ color: v })} label="Color" />
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Font Family</Label>
                <Select value={props.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Arial, Helvetica, sans-serif">Arial</SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet</SelectItem>
                        <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                        <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}

function TextSettings({ props, onChange }: { props: TextProps; onChange: (p: Partial<TextProps>) => void }) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Text Content</Label>
                <textarea
                    value={props.text}
                    onChange={(e) => onChange({ text: e.target.value })}
                    rows={5}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary resize-y"
                />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Alignment</Label>
                <AlignmentPicker value={props.alignment} onChange={(v) => onChange({ alignment: v as any })} />
            </div>
            <ColorInput value={props.color} onChange={(v) => onChange({ color: v })} label="Text Color" />
            <NumberSlider value={props.fontSize} onChange={(v) => onChange({ fontSize: v })} label="Font Size" min={10} max={32} />
            <NumberSlider value={props.lineHeight} onChange={(v) => onChange({ lineHeight: v })} label="Line Height" min={1} max={2.5} step={0.1} unit="x" />
        </div>
    )
}

function ImageSettings({ props, onChange }: { props: ImageProps; onChange: (p: Partial<ImageProps>) => void }) {
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const isMustache = props.src.startsWith('{{')
    const hasDirectUrl = !isMustache && props.src.startsWith('http')

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Image Source</Label>
                <div className="flex gap-2">
                    <Input
                        value={props.src}
                        onChange={(e) => onChange({ src: e.target.value })}
                        className="text-sm font-mono flex-1 h-8"
                        placeholder="{{hero_src}} or URL"
                    />
                    <button
                        onClick={() => setIsPickerOpen(true)}
                        className="h-8 px-2.5 rounded-md border border-border bg-background hover:bg-muted transition-colors flex items-center gap-1.5 flex-shrink-0"
                        title="Browse Asset Library"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">Browse</span>
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Use {"{{variable}}"} for mustache vars, or pick from Asset Library</p>

                {/* Image Preview */}
                {hasDirectUrl && (
                    <div className="rounded border border-border overflow-hidden bg-muted/50 flex items-center justify-center p-2 mt-2">
                        <img
                            src={props.src}
                            alt={props.alt}
                            className="max-w-full max-h-24 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Alt Text</Label>
                <Input value={props.alt} onChange={(e) => onChange({ alt: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Link URL</Label>
                <Input value={props.linkUrl} onChange={(e) => onChange({ linkUrl: e.target.value })} className="text-sm font-mono" placeholder="{{hero_link_url}}" />
            </div>
            <NumberSlider value={props.width} onChange={(v) => onChange({ width: v })} label="Width" min={100} max={600} />
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Alignment</Label>
                <AlignmentPicker value={props.alignment} onChange={(v) => onChange({ alignment: v as any })} />
            </div>

            <AssetPickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={(url) => {
                    onChange({ src: url })
                    setIsPickerOpen(false)
                }}
            />
        </div>
    )
}

function ButtonSettings({ props, onChange }: { props: ButtonProps; onChange: (p: Partial<ButtonProps>) => void }) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Button Text</Label>
                <Input value={props.text} onChange={(e) => onChange({ text: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Link URL</Label>
                <Input value={props.url} onChange={(e) => onChange({ url: e.target.value })} className="text-sm font-mono" placeholder="{{cta_link_url}}" />
            </div>
            <ColorInput value={props.bgColor} onChange={(v) => onChange({ bgColor: v })} label="Background Color" />
            <ColorInput value={props.textColor} onChange={(v) => onChange({ textColor: v })} label="Text Color" />
            <NumberSlider value={props.borderRadius} onChange={(v) => onChange({ borderRadius: v })} label="Border Radius" min={0} max={50} />
            <NumberSlider value={props.fontSize} onChange={(v) => onChange({ fontSize: v })} label="Font Size" min={12} max={24} />
            <NumberSlider value={props.paddingX} onChange={(v) => onChange({ paddingX: v })} label="Horizontal Padding" min={8} max={60} />
            <NumberSlider value={props.paddingY} onChange={(v) => onChange({ paddingY: v })} label="Vertical Padding" min={4} max={30} />
            <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-muted-foreground">Full Width</Label>
                <Switch checked={props.fullWidth} onCheckedChange={(v) => onChange({ fullWidth: v })} />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Alignment</Label>
                <AlignmentPicker value={props.alignment} onChange={(v) => onChange({ alignment: v as any })} />
            </div>
        </div>
    )
}

function DividerSettings({ props, onChange }: { props: DividerProps; onChange: (p: Partial<DividerProps>) => void }) {
    return (
        <div className="space-y-4">
            <ColorInput value={props.color} onChange={(v) => onChange({ color: v })} label="Line Color" />
            <NumberSlider value={props.thickness} onChange={(v) => onChange({ thickness: v })} label="Thickness" min={1} max={8} />
            <NumberSlider value={props.widthPercent} onChange={(v) => onChange({ widthPercent: v })} label="Width" min={10} max={100} unit="%" />
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Style</Label>
                <Select value={props.style} onValueChange={(v) => onChange({ style: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}

function SpacerSettings({ props, onChange }: { props: SpacerProps; onChange: (p: Partial<SpacerProps>) => void }) {
    return (
        <div className="space-y-4">
            <NumberSlider value={props.height} onChange={(v) => onChange({ height: v })} label="Height" min={4} max={120} />
        </div>
    )
}

function SocialSettings({ props, onChange }: { props: SocialProps; onChange: (p: Partial<SocialProps>) => void }) {
    const PLATFORMS: SocialNetwork['platform'][] = ['facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok']

    const updateNetwork = (index: number, field: keyof SocialNetwork, value: string) => {
        const updated = [...props.networks]
        updated[index] = { ...updated[index], [field]: value }
        onChange({ networks: updated })
    }

    const addNetwork = () => {
        const used = new Set(props.networks.map(n => n.platform))
        const next = PLATFORMS.find(p => !used.has(p))
        if (next) {
            onChange({ networks: [...props.networks, { platform: next, url: '' }] })
        }
    }

    const removeNetwork = (index: number) => {
        onChange({ networks: props.networks.filter((_, i) => i !== index) })
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Alignment</Label>
                <AlignmentPicker value={props.alignment} onChange={(v) => onChange({ alignment: v as any })} />
            </div>
            <NumberSlider value={props.iconSize} onChange={(v) => onChange({ iconSize: v })} label="Icon Size" min={20} max={48} />
            <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground">Networks</Label>
                {props.networks.map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Select value={n.platform} onValueChange={(v) => updateNetwork(i, 'platform', v)}>
                            <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            value={n.url}
                            onChange={(e) => updateNetwork(i, 'url', e.target.value)}
                            className="h-8 text-xs flex-1"
                            placeholder="https://..."
                        />
                        <button onClick={() => removeNetwork(i)} className="text-red-500 hover:text-red-700 text-xs px-1">×</button>
                    </div>
                ))}
                {props.networks.length < PLATFORMS.length && (
                    <button onClick={addNetwork} className="text-xs text-primary hover:underline">+ Add network</button>
                )}
            </div>
        </div>
    )
}

// --- Main Component ---

export function BlockSettings({ block, onUpdate }: BlockSettingsProps) {
    const handleChange = useCallback((partial: Record<string, any>) => {
        if (!block) return
        onUpdate(block.id, { ...block.props, ...partial })
    }, [block, onUpdate])

    if (!block) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <Settings className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm text-center">Select a block to edit its properties</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-border bg-muted/20">
                <p className="text-xs font-semibold text-foreground">{BLOCK_LABELS[block.type]}</p>
                <p className="text-[10px] text-muted-foreground">Edit the properties below</p>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4">
                    {block.type === 'heading' && <HeadingSettings props={block.props as HeadingProps} onChange={handleChange} />}
                    {block.type === 'text' && <TextSettings props={block.props as TextProps} onChange={handleChange} />}
                    {block.type === 'image' && <ImageSettings props={block.props as ImageProps} onChange={handleChange} />}
                    {block.type === 'button' && <ButtonSettings props={block.props as ButtonProps} onChange={handleChange} />}
                    {block.type === 'divider' && <DividerSettings props={block.props as DividerProps} onChange={handleChange} />}
                    {block.type === 'spacer' && <SpacerSettings props={block.props as SpacerProps} onChange={handleChange} />}
                    {block.type === 'social' && <SocialSettings props={block.props as SocialProps} onChange={handleChange} />}
                </div>
            </ScrollArea>
        </div>
    )
}
