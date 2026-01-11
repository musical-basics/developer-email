"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, Bot, Zap, Brain, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "details" | "result"
    content: string
    images?: string[] // Store base64 images for display
}

interface CopilotPaneProps {
    html: string
    onHtmlChange: (html: string) => void
}

export function CopilotPane({ html, onHtmlChange }: CopilotPaneProps) {
    const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-20250514") // Default to Sonnet (Best for vision)

    const [messages, setMessages] = useState<Message[]>([
        { role: "result", content: "Hi! I can see. Paste a screenshot (Ctrl+V) and tell me what to fix." },
    ])
    const [input, setInput] = useState("")
    const [pendingImages, setPendingImages] = useState<string[]>([]) // Images waiting to be sent
    const [isLoading, setIsLoading] = useState(false)
    const [loadingText, setLoadingText] = useState("Thinking...") // <--- NEW STATE
    const scrollAreaRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
            if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
    }, [messages, pendingImages, loadingText])

    // --- THE THOUGHT LOOP ---
    useEffect(() => {
        if (!isLoading) return

        const thoughts = [
            "Analyzing HTML structure...",
            "Identifying style patterns...",
            "Drafting CSS improvements...",
            "Checking responsiveness...",
            "Finalizing code..."
        ]

        let i = 0
        setLoadingText(thoughts[0])

        const interval = setInterval(() => {
            i = (i + 1) % thoughts.length
            setLoadingText(thoughts[i])
        }, 3000) // Change message every 3 seconds

        return () => clearInterval(interval)
    }, [isLoading])

    // --- PASTE HANDLER ---
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault()
                const blob = items[i].getAsFile()
                const reader = new FileReader()
                reader.onload = (event) => {
                    const base64 = event.target?.result as string
                    setPendingImages(prev => [...prev, base64])
                }
                if (blob) reader.readAsDataURL(blob)
            }
        }
    }

    const removeImage = (index: number) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index))
    }

    const handleSendMessage = async () => {
        if ((!input.trim() && pendingImages.length === 0) || isLoading) return

        const userMessage = input.trim()
        const imagesToSend = [...pendingImages]

        // Clear inputs immediately
        setInput("")
        setPendingImages([])

        // Add to UI
        setMessages((prev) => [...prev, {
            role: "user",
            content: userMessage,
            images: imagesToSend
        }])

        setIsLoading(true)

        try {
            const response = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentHtml: html,
                    prompt: userMessage,
                    images: imagesToSend, // Send images to backend
                    model: selectedModel
                }),
            })

            if (!response.ok) throw new Error("Failed to get response")

            const data = await response.json()

            if (data.updatedHtml) onHtmlChange(data.updatedHtml)

            setMessages((prev) => [
                ...prev,
                { role: "result", content: data.explanation || "Updated." },
            ])
        } catch (error) {
            console.error("API Error:", error)
            setMessages((prev) => [
                ...prev,
                { role: "result", content: "Error processing request." },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    return (
        <div className="flex flex-col h-full border-l border-border bg-card">
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center px-4 gap-2 justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-semibold">Copilot Vision</h2>
                </div>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet</SelectItem>
                        <SelectItem value="gemini-2.5-pro">Gemini Pro</SelectItem>
                        <SelectItem value="gemini-2.5-flash">Gemini Flash</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Chat History */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={cn("flex flex-col gap-2 max-w-[90%]", msg.role === "user" ? "ml-auto" : "mr-auto")}>
                            {/* Render User Images */}
                            {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {msg.images.map((img, i) => (
                                        <img key={i} src={img} alt="User upload" className="w-24 h-auto rounded-md border border-white/20" />
                                    ))}
                                </div>
                            )}

                            {/* Render Text */}
                            {msg.content && (
                                <div className={cn(
                                    "p-3 rounded-lg text-sm",
                                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                )}>
                                    {msg.content}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="bg-muted text-foreground p-3 rounded-lg text-sm mr-auto w-fit flex items-center gap-2">
                            {/* Simple Spinner */}
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span className="animate-pulse">{loadingText}</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border mt-auto shrink-0 space-y-3">
                {/* Pending Images Preview */}
                {pendingImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {pendingImages.map((img, i) => (
                            <div key={i} className="relative group">
                                <img src={img} className="h-16 w-auto rounded border border-white/10" />
                                <button
                                    onClick={() => removeImage(i)}
                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste} // <--- The Magic Listener
                        placeholder="Paste image (Ctrl+V) or type..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button size="icon" onClick={handleSendMessage} disabled={isLoading || (!input.trim() && pendingImages.length === 0)}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
