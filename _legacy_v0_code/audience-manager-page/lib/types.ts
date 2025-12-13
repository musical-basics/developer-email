export type SubscriberStatus = "Active" | "Bounced" | "Unsubscribed"

export interface Subscriber {
  id: string
  email: string
  firstName: string
  lastName: string
  tags: string[]
  status: SubscriberStatus
  addedAt: string
  notes: string
}
