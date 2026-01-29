export type CampaignStatus = 'draft' | 'active' | 'completed'

export interface Campaign {
    id: string
    created_at: string
    updated_at: string
    name: string
    subject_line: string | null
    html_content: string | null
    variable_values: Record<string, any> | null
    status: CampaignStatus

    // Analytics
    total_recipients: number
    total_opens: number
    total_clicks: number
    average_read_time: number
}

export interface Subscriber {
    id: string
    email: string
    first_name: string
    last_name: string
    tags: string[] | null
    status: 'active' | 'unsubscribed' | 'bounced'
    created_at: string
}
