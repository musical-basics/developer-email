"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, X, Zap, Brain, Bot, Paperclip, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"


interface Message {
    role: "user" | "details" | "result"
    content: string
    // We now store URLs instead of base64 to save memory
    imageUrls?: string[]
}

interface CopilotPaneProps {
    html: string
    onHtmlChange: (html: string, prompt: string) => void
    audienceContext?: "dreamplay" | "musicalbasics" | "both"
    aiDossier?: string
}

import { getAnthropicModels } from "@/app/actions/ai-models"

export function CopilotPane({ html, onHtmlChange, audienceContext = "dreamplay", aiDossier = "" }: CopilotPaneProps) {
    const [selectedModel, setSelectedModel] = useState("claude-3-5-sonnet-20240620")
    const [availableModels, setAvailableModels] = useState<string[]>([])

    useEffect(() => {
        getAnthropicModels().then(models => {
            if (models.length > 0) {
                setAvailableModels(models)
                // If current selection isn't in list, switch to the first available one (usually the newest)
                if (!models.includes(selectedModel) && !selectedModel.includes("gemini")) {
                    setSelectedModel(models[0])
                }
            }
        })
    }, [])

    // We keep a "real" history with full context for the API
    const [messages, setMessages] = useState<Message[]>([
        { role: "result", content: "I'm ready. Upload screenshots or reference images and I'll adapt the code." },
    ])

    const [input, setInput] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const [pendingAttachments, setPendingAttachments] = useState<string[]>([]) // URLs
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading, pendingAttachments])

    const uploadFile = async (file: File) => {
        setIsUploading(true)
        try {
            // 2. Use Server-Side Upload (Bypasses RLS)
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Upload failed")
            }

            setPendingAttachments(prev => [...prev, data.url])
        } catch (error: any) {
            console.error("Upload failed:", error)
            setMessages(prev => [...prev, { role: 'result', content: `❌ Failed to upload image: ${file.name} (${error.message})` }])
        } finally {
            setIsUploading(false)
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault()
                const file = items[i].getAsFile()
                if (file) uploadFile(file)
            }
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach(file => uploadFile(file))
        }
    }

    const handleSendMessage = async () => {
        if ((!input.trim() && pendingAttachments.length === 0) || isLoading || isUploading) return

        const userMessage = input.trim()
        const attachments = [...pendingAttachments]

        // Clear input immediately
        setInput("")
        setPendingAttachments([])

        // 1. Add to UI state
        const newMessage: Message = {
            role: "user",
            content: userMessage,
            imageUrls: attachments
        }

        // Append to local history
        const newHistory = [...messages, newMessage]
        setMessages(newHistory)
        setIsLoading(true)

        try {
            // 2. Send to API (Now lightweight because we only send URLs!)
            const response = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentHtml: html,
                    messages: newHistory,
                    model: selectedModel,
                    audienceContext,
                    aiDossier
                }),
            })

            const data = await response.json()

            if (!response.ok) throw new Error(data.error || "Failed to generate code")

            if (data.updatedHtml) {
                onHtmlChange(data.updatedHtml, userMessage)
            }

            setMessages(prev => [
                ...prev,
                { role: "result", content: data.explanation || "Done." }
            ])

        } catch (error: any) {
            console.error("Copilot Error:", error)
            setMessages(prev => [
                ...prev,
                { role: "result", content: `Error: ${error.message}` }
            ])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full border-l border-border bg-card text-card-foreground">
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center px-4 gap-2 justify-between shrink-0 bg-background/50 backdrop-blur">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-semibold">Copilot Vision</h2>
                </div>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/50 border-transparent hover:border-border">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Dynamic Anthropic Models */}
                        {availableModels.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}

                        {/* Fallback hardcoded if fetch failed */}
                        {availableModels.length === 0 && (
                            <SelectItem value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Legacy)</SelectItem>
                        )}

                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={cn("flex flex-col gap-2 max-w-[90%]", msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start")}>
                        {/* Render Images */}
                        {msg.imageUrls && msg.imageUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-1 justify-end">
                                {msg.imageUrls.map((url, i) => (
                                    <div key={i} className="relative group overflow-hidden rounded-lg border border-border">
                                        <img src={url} alt="attachment" className="h-24 w-auto object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Render Text */}
                        {msg.content && (
                            <div className={cn(
                                "p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-muted text-foreground rounded-bl-sm"
                            )}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="mr-auto flex items-center gap-2 text-muted-foreground text-sm p-2">
                        <Brain className="w-4 h-4 animate-pulse" />
                        Thinking...
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border mt-auto shrink-0 bg-background/50 backdrop-blur">
                {/* Pending Uploads */}
                {(pendingAttachments.length > 0 || isUploading) && (
                    <div className="flex gap-2 overflow-x-auto pb-3">
                        {pendingAttachments.map((url, i) => (
                            <div key={i} className="relative group shrink-0">
                                {url.toLowerCase().endsWith('.pdf') ? (
                                    <div className="h-14 w-14 rounded-md border border-border bg-muted flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                ) : (
                                    <img src={url} className="h-14 w-14 rounded-md object-cover border border-border" />
                                )}
                                <button
                                    onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {isUploading && (
                            <div className="h-14 w-14 rounded-md border border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/20">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-2 items-end">
                    <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,application/pdf"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isLoading}
                    >
                        <Paperclip className="w-5 h-5" />
                    </Button>

                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                        onPaste={handlePaste}
                        placeholder="Type a message..."
                        className="flex-1 min-h-[40px]"
                        disabled={isLoading}
                        autoFocus
                    />

                    <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={isLoading || (!input.trim() && pendingAttachments.length === 0)}
                        className={cn(isLoading && "opacity-50")}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
