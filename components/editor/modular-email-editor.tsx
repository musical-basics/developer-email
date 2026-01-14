"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { AssetLoader } from "./asset-loader"
import { CodePane } from "./code-pane"
import { PreviewPane } from "./preview-pane"
import { CopilotPane } from "./copilot-pane"
import { BlockManager, Block } from "./block-manager"
import { renderTemplate } from "@/lib/render-template"
import { Monitor, Smartphone, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModularEmailEditorProps {
    html: string
    assets: Record<string, string>
    onHtmlChange: (html: string) => void
    onAssetsChange: (assets: Record<string, string>) => void
    onSave?: () => void
}

export function ModularEmailEditor({ html: initialHtml, assets, onHtmlChange, onAssetsChange, onSave }: ModularEmailEditorProps) {
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')

    // --- BLOCK LOGIC ---
    const [blocks, setBlocks] = useState<Block[]>(() => {
        // 1. Try to split HTML intelligently
        const headMatch = initialHtml.match(/(^[\s\S]*?<body[^>]*>)/i)
        const closeMatch = initialHtml.match(/(<\/body>[\s\S]*$)/i)

        if (headMatch && closeMatch) {
            const headContent = headMatch[1]
            const closeContent = closeMatch[1]
            const bodyContent = initialHtml.replace(headContent, "").replace(closeContent, "").trim()

            return [
                { id: "head", name: "Global Styles", content: headContent },
                { id: "body-main", name: "Body Content", content: bodyContent },
                { id: "footer", name: "Closing Tags", content: closeContent }
            ]
        }
        // 2. Fallback: One big block
        return [{ id: "main", name: "Full Email", content: initialHtml }]
    })

    const [activeBlockId, setActiveBlockId] = useState<string>(blocks[0].id)

    // Reconstruct full HTML from blocks
    const fullHtml = useMemo(() => blocks.map(b => b.content).join('\n'), [blocks])

    // Sync to parent
    useEffect(() => {
        onHtmlChange(fullHtml)
    }, [fullHtml, onHtmlChange])

    const activeBlock = useMemo(() => blocks.find(b => b.id === activeBlockId) || blocks[0], [blocks, activeBlockId])

    const handleBlockContentChange = (newContent: string) => {
        setBlocks(prev => prev.map(b => b.id === activeBlockId ? { ...b, content: newContent } : b))
    }

    const addNewBlock = () => {
        const newBlock: Block = {
            id: `block-${Date.now()}`,
            name: "New Section",
            content: "\n<div>Content...</div>"
        }
        const index = blocks.findIndex(b => b.id === activeBlockId)
        const newBlocks = [...blocks]
        newBlocks.splice(index + 1, 0, newBlock) // Add after current
        setBlocks(newBlocks)
        setActiveBlockId(newBlock.id)
    }

    // --- STANDARD UTILS ---
    const extractedVariables = useMemo(() => {
        const regex = /\{\{(\w+)\}\}/g
        const matches: string[] = []
        let match
        while ((match = regex.exec(fullHtml)) !== null) {
            if (!matches.includes(match[1])) matches.push(match[1])
        }
        return matches
    }, [fullHtml])

    const updateAsset = useCallback((key: string, value: string) => {
        onAssetsChange({ ...assets, [key]: value })
    }, [assets, onAssetsChange])

    const previewHtml = useMemo(() => renderTemplate(fullHtml, assets), [fullHtml, assets])

    const handleSaveClick = async () => {
        if (!onSave) return
        setSaveStatus('saving')
        await Promise.resolve(onSave())
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* 1. UNIFIED SIDEBAR (Assets + Blocks) */}
            <div className="flex-shrink-0 w-[300px] border-r border-border h-full flex flex-col bg-card">
                {/* Top Half: Blocks */}
                <div className="flex-1 overflow-hidden border-b border-border">
                    <BlockManager
                        blocks={blocks}
                        activeBlockId={activeBlockId}
                        onSelectBlock={setActiveBlockId}
                        onUpdateBlocks={setBlocks}
                        onAddBlock={addNewBlock}
                    />
                </div>

                {/* Bottom Half: Assets */}
                <div className="h-[50%] overflow-hidden">
                    <AssetLoader variables={extractedVariables} assets={assets} onUpdateAsset={updateAsset} />
                </div>
            </div>

            {/* 2. CODE PANE (Edits Active Block Only) */}
            <div className="flex-[3] min-w-[350px] border-r border-border h-full flex flex-col">
                <div className="h-10 border-b border-border bg-muted/30 px-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Editing: <span className="font-bold text-foreground">{activeBlock.name}</span></span>
                </div>
                <CodePane code={activeBlock.content} onChange={handleBlockContentChange} className="flex-1" />
            </div>

            {/* 4. PREVIEW PANE */}
            <div className="flex-[4] flex flex-col min-w-[500px] h-full overflow-hidden">
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
                    <h2 className="text-sm font-semibold">Preview</h2>
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button onClick={() => setViewMode('desktop')} className={cn("p-1.5 rounded-md", viewMode === 'desktop' && "bg-background shadow-sm")}><Monitor className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('mobile')} className={cn("p-1.5 rounded-md", viewMode === 'mobile' && "bg-background shadow-sm")}><Smartphone className="w-4 h-4" /></button>
                    </div>
                    {onSave && (
                        <button type="button" onClick={handleSaveClick} disabled={saveStatus === 'saving'} className={cn("px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2", saveStatus === 'success' ? "bg-green-600 text-white" : "bg-primary text-primary-foreground")}>
                            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saveStatus === 'success' && <Check className="w-4 h-4" />}
                            {saveStatus === 'idle' && "Save"}
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto bg-[#0f0f10] p-8">
                    <div className="h-fit min-h-[500px] mx-auto transition-all duration-300 bg-white shadow-lg my-8" style={{ maxWidth: viewMode === 'mobile' ? '375px' : '600px' }}>
                        <PreviewPane html={previewHtml} viewMode={viewMode} />
                    </div>
                </div>
            </div>

            {/* 5. COPILOT (Context Aware) */}
            <div className="w-[350px] flex-shrink-0 border-l border-border bg-card h-full overflow-hidden">
                <CopilotPane
                    html={fullHtml} // We give it FULL HTML so it sees context...
                    onHtmlChange={(newHtml) => {
                        // If Copilot returns full HTML, we try to detect if it's just a snippet update
                        // For now, in this Pro mode, we just update the active block to be safe
                        // OR we warn the user. Ideally, Copilot should learn to return Blocks.
                        handleBlockContentChange(newHtml)
                    }}
                />
            </div>
        </div>
    )
}
