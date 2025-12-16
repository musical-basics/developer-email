import { redirect } from "next/navigation"

export default function Home() {
  // Redirect to a sample campaign for demo purposes
  redirect("/dashboard/campaign-123")
}
