"use client"

import { Type, Image, MousePointerClick, Minus, ArrowUpDown, Share2, Heading } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BlockType } from "@/lib/dnd-blocks/types"
import { BLOCK_LABELS, BLOCK_DESCRIPTIONS } from "@/lib/dnd-blocks/defaults"

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
    heading: Heading,
    text: Type,
    image: Image,
    button: MousePointerClick,
    divider: Minus,
    spacer: ArrowUpDown,
    social: Share2,
}

const PALETTE_ORDER: BlockType[] = ['heading', 'text', 'image', 'button', 'divider', 'spacer', 'social']

interface BlockPaletteProps {
    onAddBlock: (type: BlockType) => void
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
    return (
        <div className="p-3 space-y-1.5">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground px-1 mb-2">Content Blocks</p>
            <div className="grid grid-cols-2 gap-2">
                {PALETTE_ORDER.map((type) => {
                    const Icon = BLOCK_ICONS[type]
                    return (
                        <button
                            key={type}
                            onClick={() => onAddBlock(type)}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('block-type', type)
                                e.dataTransfer.effectAllowed = 'copy'
                            }}
                            className={cn(
                                "flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border",
                                "bg-background hover:bg-muted hover:border-primary/30 transition-all",
                                "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground",
                                "group"
                            )}
                        >
                            <Icon className="w-5 h-5 group-hover:text-primary transition-colors" />
                            <span className="text-[11px] font-medium leading-tight">{BLOCK_LABELS[type]}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
