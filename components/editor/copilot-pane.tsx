"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "details" | "result"
    content: string
}

interface CopilotPaneProps {
    html: string
    onHtmlChange: (html: string) => void
}

export function CopilotPane({ html, onHtmlChange }: CopilotPaneProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: "result", content: "Hi! I'm your Gemini Copilot. content to make changes." },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const scrollAreaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
    }, [messages])

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput("")
        setMessages((prev) => [...prev, { role: "user", content: userMessage }])
        setIsLoading(true)

        try {
            const response = await fetch("/api/copilot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentHtml: html,
                    prompt: userMessage,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to get response from Gemini")
            }

            const data = await response.json()

            if (data.updatedHtml) {
                onHtmlChange(data.updatedHtml)
            }

            setMessages((prev) => [
                ...prev,
                { role: "result", content: data.explanation || "Updated the email template." },
            ])
        } catch (error) {
            console.error("Error calling Gemini API:", error)
            setMessages((prev) => [
                ...prev,
                { role: "result", content: "Sorry, I encountered an error. Please try again." },
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
            <div className="h-14 border-b border-border flex items-center px-4 gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold">Gemini Copilot</h2>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={cn(
                                "p-3 rounded-lg text-sm max-w-[90%]",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground ml-auto"
                                    : "bg-muted text-foreground mr-auto"
                            )}
                        >
                            {msg.content}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="bg-muted text-foreground p-3 rounded-lg text-sm mr-auto w-fit animate-pulse">
                            Thinking...
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-border mt-auto">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Gemini to change..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button size="icon" onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
