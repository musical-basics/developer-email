"use client"

import { useState } from "react"
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { BlockRenderer } from "./block-renderers"
import type { EmailBlock, BlockType } from "@/lib/dnd-blocks/types"
import { BLOCK_DEFAULTS } from "@/lib/dnd-blocks/defaults"

interface DndCanvasProps {
    blocks: EmailBlock[]
    selectedBlockId: string | null
    onSelectBlock: (id: string | null) => void
    onUpdateBlocks: (blocks: EmailBlock[]) => void
}

export function DndCanvas({ blocks, selectedBlockId, onSelectBlock, onUpdateBlocks }: DndCanvasProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

    const moveBlock = (index: number, direction: -1 | 1) => {
        const target = index + direction
        if (target < 0 || target >= blocks.length) return
        const newBlocks = [...blocks]
            ;[newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]]
        onUpdateBlocks(newBlocks)
    }

    const duplicateBlock = (index: number) => {
        const block = blocks[index]
        const newBlock: EmailBlock = {
            ...block,
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            props: { ...block.props },
        }
        const newBlocks = [...blocks]
        newBlocks.splice(index + 1, 0, newBlock)
        onUpdateBlocks(newBlocks)
        onSelectBlock(newBlock.id)
    }

    const deleteBlock = (id: string) => {
        const newBlocks = blocks.filter(b => b.id !== id)
        onUpdateBlocks(newBlocks)
        if (selectedBlockId === id) {
            onSelectBlock(newBlocks.length > 0 ? newBlocks[0].id : null)
        }
    }

    // --- DnD Handlers ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        const isPaletteDrag = e.dataTransfer.types.includes('block-type')
        e.dataTransfer.dropEffect = isPaletteDrag ? 'copy' : 'move'
        setDropTargetIndex(index)
    }

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault()
        setDropTargetIndex(null)

        // Case 1: Drop from palette (new block)
        const paletteType = e.dataTransfer.getData('block-type') as BlockType
        if (paletteType && BLOCK_DEFAULTS[paletteType]) {
            const newBlock: EmailBlock = {
                id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: paletteType,
                props: { ...BLOCK_DEFAULTS[paletteType] } as any,
            }
            const newBlocks = [...blocks]
            newBlocks.splice(dropIndex, 0, newBlock)
            onUpdateBlocks(newBlocks)
            onSelectBlock(newBlock.id)
            setDraggedIndex(null)
            return
        }

        // Case 2: Reorder existing block
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null)
            return
        }
        const newBlocks = [...blocks]
        const [movedItem] = newBlocks.splice(draggedIndex, 1)
        newBlocks.splice(dropIndex, 0, movedItem)
        onUpdateBlocks(newBlocks)
        setDraggedIndex(null)
    }

    // Handle drop on the empty canvas area (for palette drags)
    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDropTargetIndex(null)
        const paletteType = e.dataTransfer.getData('block-type') as BlockType
        if (paletteType && BLOCK_DEFAULTS[paletteType]) {
            const newBlock: EmailBlock = {
                id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: paletteType,
                props: { ...BLOCK_DEFAULTS[paletteType] } as any,
            }
            onUpdateBlocks([...blocks, newBlock])
            onSelectBlock(newBlock.id)
        }
    }

    const handleCanvasDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
    }

    return (
        <div className="h-full overflow-y-auto">
            <div
                className="p-6 pb-32 min-h-full"
                onDrop={handleCanvasDrop}
                onDragOver={handleCanvasDragOver}
            >
                {/* Email container preview */}
                <div className="max-w-[600px] mx-auto bg-white shadow-lg rounded-sm min-h-[400px]">
                    {blocks.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
                            <p className="text-sm">Drag blocks here or click them from the palette</p>
                            <p className="text-xs mt-1">Or use the Copilot to generate blocks with AI</p>
                        </div>
                    )}
                    {blocks.map((block, index) => (
                        <div
                            key={block.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={() => { setDraggedIndex(null); setDropTargetIndex(null) }}
                            onClick={(e) => { e.stopPropagation(); onSelectBlock(block.id) }}
                            className={cn(
                                "group relative transition-all cursor-pointer",
                                selectedBlockId === block.id
                                    ? "ring-2 ring-primary ring-inset"
                                    : "hover:ring-1 hover:ring-primary/30 hover:ring-inset",
                                draggedIndex === index && "opacity-40",
                                dropTargetIndex === index && draggedIndex !== index && "border-t-2 border-primary",
                            )}
                        >
                            {/* Block toolbar */}
                            <div className={cn(
                                "absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                                selectedBlockId === block.id && "opacity-100"
                            )}>
                                <button className="p-1 rounded bg-card border border-border hover:bg-muted cursor-grab active:cursor-grabbing" title="Drag to reorder">
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Hover toolbar (right side) */}
                            <div className={cn(
                                "absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                                selectedBlockId === block.id && "opacity-100"
                            )}>
                                <button onClick={(e) => { e.stopPropagation(); moveBlock(index, -1) }} className="p-1 rounded bg-card border border-border hover:bg-muted" title="Move up" disabled={index === 0}>
                                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); moveBlock(index, 1) }} className="p-1 rounded bg-card border border-border hover:bg-muted" title="Move down" disabled={index === blocks.length - 1}>
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); duplicateBlock(index) }} className="p-1 rounded bg-card border border-border hover:bg-muted" title="Duplicate">
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id) }} className="p-1 rounded bg-card border border-border hover:bg-red-100 hover:border-red-300" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </button>
                            </div>

                            {/* Block type label */}
                            {selectedBlockId === block.id && (
                                <div className="absolute -top-5 left-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-t font-medium uppercase tracking-wider">
                                    {block.type}
                                </div>
                            )}

                            {/* Block content */}
                            <BlockRenderer block={block} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
