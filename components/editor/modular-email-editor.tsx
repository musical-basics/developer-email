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

// --- HELPER: SMART SPLITTER ---
// This function tears apart a monolithic HTML file into logical blocks
const parseMonolithToBlocks = (fullHtml: string): Block[] => {
    const blocks: Block[] = []

    // 1. Extract HEAD (Global Styles)
    const headMatch = fullHtml.match(/(^[\s\S]*?<body[^>]*>)/i)
    const headContent = headMatch ? headMatch[1] : ""
    blocks.push({ id: "head", name: "Global Styles & Head", content: headContent })

    // 2. Extract FOOTER (Closing tags)
    const closeMatch = fullHtml.match(/(<\/body>[\s\S]*$)/i)
    const closeContent = closeMatch ? closeMatch[1] : ""

    // 3. Extract BODY CONTENT
    let bodyContent = fullHtml
    if (headContent) bodyContent = bodyContent.replace(headContent, "")
    if (closeContent) bodyContent = bodyContent.replace(closeContent, "")
    bodyContent = bodyContent.trim()

    // 4. MAGIC: Split Body into Logical Sections
    // We look for top-level HTML tags that look like containers.
    // Regex explanation: Find a tag that starts with <div, <table, <section and capture everything until it closes.
    // Note: Regex parsing HTML is fragile, but sufficient for top-level block splitting in emails.

    // Strategy: We split by "<!-- BLOCK: Name -->" comments if they exist.
    // If NOT, we try to split by standard container tags.

    const commentSplit = bodyContent.split(/<!-- BLOCK: (.*?) -->/i)

    if (commentSplit.length > 1) {
        // Option A: The user already has "BLOCK:" comments. Use them!
        // The split array looks like: [pre-text, "Block Name 1", "Content 1", "Block Name 2", "Content 2"...]
        for (let i = 1; i < commentSplit.length; i += 2) {
            const name = commentSplit[i].trim()
            const content = commentSplit[i + 1]?.trim() || ""
            blocks.push({ id: `block-${i}`, name: name, content: content })
        }
    } else {
        // Option B: The "Wild West". We assume every top-level <table> or <div> is a block.
        // We wrap them in comments so they persist next time.

        // This regex looks for high-level containers
        const tagRegex = /(<(table|div|section)[^>]*>[\s\S]*?<\/\2>)/gi
        let match
        let lastIndex = 0
        let count = 1

        while ((match = tagRegex.exec(bodyContent)) !== null) {
            // content BEFORE the tag (usually whitespace or stray text)
            const gap = bodyContent.slice(lastIndex, match.index).trim()
            if (gap) {
                blocks.push({ id: `gap-${count}`, name: `Text Section ${count}`, content: gap })
            }

            // The TAG itself
            const tagContent = match[0]
            // Try to guess a name based on content
            let name = `Section ${count}`
            if (tagContent.includes("img")) name = `Image Block ${count}`
            if (tagContent.includes("<h")) name = `Text/Header Block ${count}`
            if (tagContent.includes("button") || tagContent.includes("<a ")) name = `CTA Block ${count}`
            if (tagContent.includes("social")) name = "Social Links"

            blocks.push({ id: `auto-${count}`, name: name, content: tagContent })

            lastIndex = tagRegex.lastIndex
            count++
        }

        // Catch any trailing content
        const tail = bodyContent.slice(lastIndex).trim()
        if (tail) blocks.push({ id: "tail", name: "Footer Content", content: tail })
    }

    // 5. Add Footer
    blocks.push({ id: "footer", name: "Closing Tags", content: closeContent })

    return blocks
}


export function ModularEmailEditor({ html: initialHtml, assets, onHtmlChange, onAssetsChange, onSave }: ModularEmailEditorProps) {
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')

    // INITIALIZE BLOCKS using the new Smart Parser
    const [blocks, setBlocks] = useState<Block[]>(() => parseMonolithToBlocks(initialHtml))

    const [activeBlockId, setActiveBlockId] = useState<string>(blocks[1]?.id || blocks[0].id)

    // Reconstruct full HTML from blocks + Enforce Block Comments
    const fullHtml = useMemo(() => {
        return blocks.map(b => {
            // Don't wrap head/footer in comments to keep file clean
            if (b.id === 'head' || b.id === 'footer') return b.content

            // Wrap others in "Markers" so the parser finds them next time
            return `<!-- BLOCK: ${b.name} -->\n${b.content}`
        }).join('\n\n')
    }, [blocks])

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
            content: "<div style='padding: 20px;'>New Content</div>"
        }
        const index = blocks.findIndex(b => b.id === activeBlockId)
        const newBlocks = [...blocks]
        newBlocks.splice(index + 1, 0, newBlock)
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

            {/* 3. PREVIEW PANE */}
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
                    html={fullHtml}
                    onHtmlChange={(newHtml) => {
                        // If Copilot returns full HTML, parse it back into blocks
                        // NOTE: This assumes Copilot respects the Block structure or we just re-split it
                        // Ideally we teach Copilot to return partial HTML, but for now we accept full HTML
                        // and re-parse it to keep state in sync.

                        // Check if it's a "global" update (full HTML) or a "snippet"
                        if (newHtml.includes("<body") || newHtml.includes("Global Styles")) {
                            // It looks like a full file
                            const newBlocks = parseMonolithToBlocks(newHtml)
                            setBlocks(newBlocks)
                            // Try to keep the active block if it still exists, otherwise default
                            if (!newBlocks.some(b => b.id === activeBlockId)) {
                                setActiveBlockId(newBlocks[1]?.id || newBlocks[0].id)
                            }
                        } else {
                            // It might be just a snippet for the active block
                            handleBlockContentChange(newHtml)
                        }
                    }}
                />
            </div>
        </div>
    )
}
