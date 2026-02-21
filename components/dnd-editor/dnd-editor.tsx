"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Monitor, Smartphone, ArrowLeft, Loader2, Check, Eye, Pencil, ChevronDown } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

import { BlockPalette } from "./block-palette"
import { DndCanvas } from "./dnd-canvas"
import { BlockSettings } from "./block-settings"
import { DndCopilotPane } from "./dnd-copilot-pane"

import type { EmailBlock, BlockType, EmailDesign } from "@/lib/dnd-blocks/types"
import { BLOCK_DEFAULTS } from "@/lib/dnd-blocks/defaults"
import { compileBlocksToHtml } from "@/lib/dnd-blocks/compiler"
import { renderTemplate } from "@/lib/render-template"

interface DndEmailEditorProps {
    blocks: EmailDesign
    assets: Record<string, string>
    subjectLine: string
    fromName: string
    fromEmail: string
    audienceContext: "dreamplay" | "musicalbasics" | "both"
    aiDossier?: string
    onBlocksChange: (blocks: EmailDesign) => void
    onAssetsChange: (assets: Record<string, string>) => void
    onSubjectChange: (value: string) => void
    onSenderChange: (field: "name" | "email", value: string) => void
    onAudienceChange: (value: "dreamplay" | "musicalbasics" | "both") => void
    campaignName: string
    onNameChange: (name: string) => void
    onSave?: () => void
    onSaveAsNew?: () => void
    isExisting?: boolean
}

export function DndEmailEditor({
    blocks,
    assets,
    subjectLine,
    fromName,
    fromEmail,
    audienceContext,
    aiDossier,
    onBlocksChange,
    onAssetsChange,
    onSubjectChange,
    onSenderChange,
    onAudienceChange,
    campaignName,
    onNameChange,
    onSave,
    onSaveAsNew,
    isExisting,
}: DndEmailEditorProps) {
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
    const [mode, setMode] = useState<'edit' | 'preview'>('edit')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')
    const [saveDropdownOpen, setSaveDropdownOpen] = useState(false)
    const saveDropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
                setSaveDropdownOpen(false)
            }
        }
        if (saveDropdownOpen) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [saveDropdownOpen])

    const selectedBlock = useMemo(
        () => blocks.find(b => b.id === selectedBlockId) || null,
        [blocks, selectedBlockId]
    )

    // Extract mustache variables from all block props
    const extractedVariables = useMemo(() => {
        const regex = /\{\{(\w+)\}\}/g
        const matches = new Set<string>()
        const jsonStr = JSON.stringify(blocks)
        let match
        while ((match = regex.exec(jsonStr)) !== null) {
            matches.add(match[1])
        }
        return Array.from(matches)
    }, [blocks])

    const updateAsset = useCallback((key: string, value: string) => {
        onAssetsChange({ ...assets, [key]: value })
    }, [assets, onAssetsChange])

    // Compile blocks → HTML → replace mustache vars for preview
    const compiledHtml = useMemo(() => compileBlocksToHtml(blocks), [blocks])
    const previewHtml = useMemo(() => renderTemplate(compiledHtml, assets), [compiledHtml, assets])

    // --- Handlers ---

    const addBlock = (type: BlockType) => {
        const newBlock: EmailBlock = {
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type,
            props: { ...BLOCK_DEFAULTS[type] } as any,
        }
        onBlocksChange([...blocks, newBlock])
        setSelectedBlockId(newBlock.id)
    }

    const updateBlockProps = useCallback((id: string, newProps: Record<string, any>) => {
        onBlocksChange(blocks.map(b => b.id === id ? { ...b, props: newProps } as any : b))
    }, [blocks, onBlocksChange])

    const handleCopilotUpdate = (newBlocks: EmailBlock[], prompt: string) => {
        onBlocksChange(newBlocks)
        if (newBlocks.length > 0) {
            setSelectedBlockId(newBlocks[0].id)
        }
    }

    const handleSaveClick = async () => {
        if (!onSave) return
        setSaveStatus('saving')
        await Promise.resolve(onSave())
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* === LEFT SIDEBAR: Palette + Settings + Assets === */}
            <div className="flex-shrink-0 w-[280px] border-r border-border h-full flex flex-col bg-card">
                {/* Back Link */}
                <div className="p-3 border-b border-border">
                    <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-3 h-3" />
                        Back to Dashboard
                    </Link>
                </div>

                {/* Campaign Settings (compact) */}
                <div className="p-3 border-b border-border bg-muted/20 space-y-2">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">Campaign Name</label>
                        <input
                            type="text"
                            value={campaignName}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                            placeholder="Campaign Name"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">Subject Line</label>
                        <input
                            type="text"
                            value={subjectLine}
                            onChange={(e) => onSubjectChange(e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                            placeholder="Enter subject line..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground">From Name</label>
                            <input type="text" value={fromName} onChange={(e) => onSenderChange("name", e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground">From Email</label>
                            <input type="text" value={fromEmail} onChange={(e) => onSenderChange("email", e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">Target Audience</label>
                        <select
                            value={audienceContext}
                            onChange={(e) => onAudienceChange(e.target.value as any)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="dreamplay">DreamPlay</option>
                            <option value="musicalbasics">MusicalBasics</option>
                            <option value="both">Both (Crossover)</option>
                        </select>
                    </div>
                </div>

                {/* Block Palette */}
                <div className="border-b border-border">
                    <BlockPalette onAddBlock={addBlock} />
                </div>

                {/* Assets */}
                {extractedVariables.length > 0 && (
                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Variables</p>
                            {extractedVariables.map(v => (
                                <div key={v} className="space-y-0.5">
                                    <label className="text-[10px] text-muted-foreground font-mono">{`{{${v}}}`}</label>
                                    <input
                                        type="text"
                                        value={assets[v] || ""}
                                        onChange={(e) => updateAsset(v, e.target.value)}
                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                                        placeholder={v.includes('src') || v.includes('img') || v.includes('image') ? 'Image URL' : 'Value'}
                                    />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* === CENTER: Canvas or Preview === */}
            <div className="flex-1 flex flex-col min-w-[400px] h-full overflow-hidden">
                {/* Toolbar */}
                <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Edit / Preview toggle */}
                        <div className="flex bg-muted p-0.5 rounded-lg">
                            <button onClick={() => setMode('edit')} className={cn("px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors", mode === 'edit' ? "bg-background shadow-sm" : "hover:bg-background/50")}>
                                <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => setMode('preview')} className={cn("px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors", mode === 'preview' ? "bg-background shadow-sm" : "hover:bg-background/50")}>
                                <Eye className="w-3 h-3" /> Preview
                            </button>
                        </div>

                        {mode === 'preview' && (
                            <div className="flex bg-muted p-0.5 rounded-lg ml-2">
                                <button onClick={() => setViewMode('desktop')} className={cn("p-1.5 rounded-md", viewMode === 'desktop' && "bg-background shadow-sm")}>
                                    <Monitor className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setViewMode('mobile')} className={cn("p-1.5 rounded-md", viewMode === 'mobile' && "bg-background shadow-sm")}>
                                    <Smartphone className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{blocks.length} blocks</span>
                        {onSave && (
                            <div className="relative" ref={saveDropdownRef}>
                                <div className="flex">
                                    {/* Main save button */}
                                    <button
                                        type="button"
                                        onClick={handleSaveClick}
                                        disabled={saveStatus === 'saving'}
                                        className={cn(
                                            "px-4 py-1.5 rounded-l-md text-sm font-medium flex items-center gap-2",
                                            saveStatus === 'success' ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
                                        )}
                                    >
                                        {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {saveStatus === 'success' && <Check className="w-3.5 h-3.5" />}
                                        {saveStatus === 'idle' && (isExisting ? "Save" : "Save")}
                                    </button>
                                    {/* Dropdown chevron */}
                                    <button
                                        type="button"
                                        onClick={() => setSaveDropdownOpen(!saveDropdownOpen)}
                                        className={cn(
                                            "px-1.5 py-1.5 rounded-r-md border-l border-primary-foreground/20 text-sm",
                                            saveStatus === 'success' ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
                                        )}
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {/* Dropdown menu */}
                                {saveDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-md shadow-lg z-50 py-1">
                                        <button
                                            onClick={() => { setSaveDropdownOpen(false); handleSaveClick() }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                        >
                                            {isExisting ? 'Save (Overwrite)' : 'Save'}
                                        </button>
                                        {onSaveAsNew && (
                                            <button
                                                onClick={() => { setSaveDropdownOpen(false); onSaveAsNew() }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                            >
                                                Save as New
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content area */}
                {mode === 'edit' ? (
                    <div className="flex-1 bg-[#f0f0f2] overflow-hidden">
                        <DndCanvas
                            blocks={blocks}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={setSelectedBlockId}
                            onUpdateBlocks={onBlocksChange}
                        />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto bg-[#0f0f10] p-8">
                        <div className="mx-auto transition-all duration-300 bg-white shadow-lg" style={{ maxWidth: viewMode === 'mobile' ? '375px' : '600px' }}>
                            <iframe
                                srcDoc={previewHtml}
                                className="w-full border-0"
                                style={{ minHeight: 600 }}
                                title="Email Preview"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* === RIGHT SIDEBAR: Block Settings + Copilot === */}
            <div className="flex-shrink-0 w-[320px] border-l border-border bg-card h-full flex flex-col">
                {/* Settings panel (top half) */}
                <div className="flex-1 border-b border-border overflow-hidden">
                    <BlockSettings block={selectedBlock} onUpdate={updateBlockProps} />
                </div>

                {/* Copilot (bottom half) */}
                <div className="h-[45%] overflow-hidden">
                    <DndCopilotPane blocks={blocks} onBlocksChange={handleCopilotUpdate} audienceContext={audienceContext} aiDossier={aiDossier} />
                </div>
            </div>
        </div>
    )
}
