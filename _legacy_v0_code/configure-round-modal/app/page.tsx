"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RoundConfigModal } from "@/components/round-config-modal"
import { Swords } from "lucide-react"

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(true)

  const handleLaunch = (batchSize: number, challenger: string) => {
    console.log(`Launching round with ${batchSize} subscribers`)
    console.log(`Challenger: ${challenger}`)
    setIsModalOpen(false)
  }

  return (
    <div className="dark min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold text-foreground">King of the Hill</h1>
        <p className="mb-8 text-muted-foreground">Advanced A/B Testing Tournament System</p>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-amber-400 font-semibold text-black hover:from-amber-400 hover:to-amber-300"
        >
          <Swords className="mr-2 h-4 w-4" />
          Launch Next Round
        </Button>

        <RoundConfigModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLaunch={handleLaunch} />
      </div>
    </div>
  )
}
