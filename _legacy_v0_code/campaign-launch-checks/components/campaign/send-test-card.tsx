"use client"

import { useState } from "react"
import { Send, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SendTestCard() {
  const [email, setEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSendTest = async () => {
    if (!email) return

    setIsSending(true)
    // Simulate sending test email
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSending(false)
    setIsSent(true)

    // Reset after 3 seconds
    setTimeout(() => {
      setIsSent(false)
      setEmail("")
    }, 3000)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
          <Send className="h-5 w-5 text-[#D4AF37]" />
          Send Test Email
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Verify the HTML renders correctly before broadcast.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="Enter test email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-[#D4AF37]"
          />
          <Button
            variant="secondary"
            onClick={handleSendTest}
            disabled={!email || isSending || isSent}
            className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending
              </>
            ) : isSent ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Sent!
              </>
            ) : (
              "Send Test"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
