"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, X, Zap, Brain, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "details" | "result"
    content: string
    images?: string[]
}

interface CopilotPaneProps {
    html: string
    onHtmlChange: (html: string) => void
}

export function CopilotPane({ html, onHtmlChange }: CopilotPaneProps) {
    const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-20250514")

    const [messages, setMessages] = useState<Message[]>([
        { role: "result", content: "Hi! I can see. Paste a screenshot (Ctrl+V) and tell me what to fix." },
    ])
    const [input, setInput] = useState("")
    const [pendingImages, setPendingImages] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // RESTORED: Progress State
    const [progress, setProgress] = useState(0)

    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, pendingImages, isLoading])

    // RESTORED: Zeno's Paradox Progress Bar
    useEffect(() => {
        if (!isLoading) {
            setProgress(0)
            return
        }

        // Start at 10%
        setProgress(10)

        const interval = setInterval(() => {
            setProgress((prev) => {
                // If we hit 90%, we stall there until the real data comes back
                if (prev >= 90) return prev

                // The closer we get to 90%, the slower we move
                const remaining = 90 - prev
                return prev + (remaining * 0.05) // 5% of remaining distance
            })
        }, 500) // Update every half second

        return () => clearInterval(interval)
    }, [isLoading])


    // Helper to compress images client-side
    const compressImage = (base64: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image()
            img.src = base64
            img.onload = () => {
                const canvas = document.createElement("canvas")
                let width = img.width
                let height = img.height

                // Resize if too large (max 1024px dimension)
                const MAX_DIM = 1024
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = (height / width) * MAX_DIM
                        width = MAX_DIM
                    } else {
                        width = (width / height) * MAX_DIM
                        height = MAX_DIM
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d")
                ctx?.drawImage(img, 0, 0, width, height)

                // Compress as JPEG
                resolve(canvas.toDataURL("image/jpeg", 0.8))
            }
        })
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault()
                const blob = items[i].getAsFile()
                const reader = new FileReader()
                reader.onload = async (event) => {
                    const base64 = event.target?.result as string
                    // Compress before setting state
                    const compressed = await compressImage(base64)
                    setPendingImages(prev => [...prev, compressed])
                }
                if (blob) reader.readAsDataURL(blob)
            }
        }
    }

    const removeImage = (index: number) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index))
    }

    // ⚡️ UPDATED: Send full history with OPTIMIZATION
    const handleSendMessage = async () => {
        if ((!input.trim() && pendingImages.length === 0) || isLoading) return

        const userMessage = input.trim()
        const imagesToSend = [...pendingImages]

        setInput("")
        setPendingImages([])

        // 1. Update UI with the FULL rich history (so YOU can see old images)
        const newMessage: Message = {
            role: "user",
            content: userMessage,
            images: imagesToSend
        }
        const newUiHistory = [...messages, newMessage]
        setMessages(newUiHistory)

        setIsLoading(true)

        try {
            // 2. ⚡️ OPTIMIZE FOR SERVER ⚡️
            // We create a "Lightweight" history to send to the AI.
            // Rule: Keep ALL text, but ONLY keep images from the VERY LAST message.
            const apiHistory = newUiHistory.map((msg, index) => {
                const isLastMessage = index === newUiHistory.length - 1
                return {
                    role: msg.role,
                    content: msg.content,
                    // If it's not the last message, delete the images to save data
                    images: isLastMessage ? msg.images : []
                }
            })

            const response = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentHtml: html,
                    messages: apiHistory, // <--- Send the lightweight version
                    model: selectedModel
                }),
            })

            if (!response.ok) throw new Error("Failed to get response")

            const data = await response.json()
            setProgress(100)

            if (data.updatedHtml) onHtmlChange(data.updatedHtml)

            setMessages((prev) => [
                ...prev,
                { role: "result", content: data.explanation || "Updated." },
            ])
        } catch (error) {
            console.error("API Error:", error)
            setMessages((prev) => [
                ...prev,
                { role: "result", content: "Something went wrong. The image might be too large or the server is busy. Please try again with a smaller message." },
            ])
        } finally {
            setTimeout(() => setIsLoading(false), 500)
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
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="claude-sonnet-4-20250514">
                            <div className="flex items-center gap-2">
                                <Bot className="w-3 h-3 text-orange-500" />
                                <span>Claude Sonnet 4</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="gemini-2.5-pro">
                            <div className="flex items-center gap-2">
                                <Brain className="w-3 h-3 text-blue-500" />
                                <span>Gemini 2.5 Pro</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="gemini-2.5-flash">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-yellow-500" />
                                <span>Gemini 2.5 Flash</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={cn("flex flex-col gap-2 max-w-[90%]", msg.role === "user" ? "ml-auto" : "mr-auto")}>
                            {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {msg.images.map((img, i) => (
                                        <img key={i} src={img} alt="User upload" className="w-24 h-auto rounded-md border border-white/20" />
                                    ))}
                                </div>
                            )}
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

                    {/* RESTORED: Progress Bar UI */}
                    {isLoading && (
                        <div className="bg-muted p-3 rounded-lg mr-auto w-[200px] space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Thinking...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-500 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border mt-auto shrink-0 space-y-3 bg-card">
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
                        onPaste={handlePaste}
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
