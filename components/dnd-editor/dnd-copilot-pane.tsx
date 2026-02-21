"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, X, Bot, Paperclip, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { EmailBlock } from "@/lib/dnd-blocks/types"

import { getAnthropicModels } from "@/app/actions/ai-models"

interface Message {
    role: "user" | "details" | "result"
    content: string
    imageUrls?: string[]
}

interface DndCopilotPaneProps {
    blocks: EmailBlock[]
    onBlocksChange: (blocks: EmailBlock[], prompt: string) => void
    audienceContext?: "dreamplay" | "musicalbasics" | "both"
    aiDossier?: string
}

export function DndCopilotPane({ blocks, onBlocksChange, audienceContext = "dreamplay", aiDossier = "" }: DndCopilotPaneProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [model, setModel] = useState("auto")
    const [models, setModels] = useState<string[]>([])
    const [imageUrls, setImageUrls] = useState<string[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        getAnthropicModels().then(setModels).catch(console.error)
    }, [])

    const uploadFile = async (file: File) => {
        const formData = new FormData()
        formData.append("file", file)
        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData })
            const data = await res.json()
            if (data.url) setImageUrls(prev => [...prev, data.url])
        } catch (e) {
            console.error("Upload failed", e)
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (const item of Array.from(items)) {
            if (item.type.startsWith("image/") || item.type === "application/pdf") {
                const file = item.getAsFile()
                if (file) uploadFile(file)
            }
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(uploadFile)
        }
    }

    const handleSendMessage = async () => {
        const prompt = inputValue.trim()
        if (!prompt || isLoading) return

        const userMessage: Message = { role: "user", content: prompt, imageUrls: [...imageUrls] }
        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInputValue("")
        setImageUrls([])
        setIsLoading(true)

        try {
            const res = await fetch("/api/copilot-dnd", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentBlocks: blocks,
                    messages: updatedMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                        imageUrls: m.imageUrls,
                    })),
                    model,
                    audienceContext,
                    aiDossier,
                }),
            })

            const data = await res.json()

            if (data.error) {
                setMessages(prev => [...prev, { role: "details", content: `Error: ${data.error}` }])
            } else {
                // Show explanation
                if (data.explanation) {
                    setMessages(prev => [...prev, { role: "details", content: data.explanation }])
                }

                // Apply blocks
                if (data.blocks && Array.isArray(data.blocks)) {
                    onBlocksChange(data.blocks, prompt)
                    setMessages(prev => [...prev, { role: "result", content: `Applied ${data.blocks.length} blocks to the canvas.` }])
                }
            }
        } catch (e: any) {
            setMessages(prev => [...prev, { role: "details", content: `Error: ${e.message}` }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">AI Copilot</span>
                <div className="ml-auto">
                    <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="h-7 text-[11px] w-[140px] border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="auto" className="text-xs">✨ Auto (Smart Routing)</SelectItem>
                            {models.map(m => (
                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Bot className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-xs text-center">
                            Ask the AI to create an email.<br />
                            <span className="text-muted-foreground/70">
                                "Create a welcome email with a hero image, heading, description, and CTA button"
                            </span>
                        </p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={cn(
                        "text-xs p-2.5 rounded-lg max-w-[95%]",
                        msg.role === "user" ? "bg-primary/10 text-foreground ml-auto" :
                            msg.role === "result" ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20" :
                                "bg-muted text-muted-foreground"
                    )}>
                        {msg.imageUrls && msg.imageUrls.length > 0 && (
                            <div className="flex gap-1 mb-1.5 flex-wrap">
                                {msg.imageUrls.map((url, j) => (
                                    <div key={j} className="flex items-center gap-1 bg-background/50 rounded px-1.5 py-0.5">
                                        <FileText className="w-3 h-3" />
                                        <span className="text-[10px]">Attachment {j + 1}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {msg.content}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating blocks...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Image previews */}
            {imageUrls.length > 0 && (
                <div className="px-3 py-1.5 border-t border-border flex gap-2 flex-wrap">
                    {imageUrls.map((url, i) => (
                        <div key={i} className="relative group">
                            <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
                                <FileText className="w-3 h-3" />
                                <span className="text-[10px]">File {i + 1}</span>
                            </div>
                            <button
                                onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-2 h-2" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,.pdf" />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                        onPaste={handlePaste}
                        placeholder="Describe your email..."
                        className="h-8 text-xs flex-1"
                    />
                    <Button size="sm" className="h-8 w-8 p-0" onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
