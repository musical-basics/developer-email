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
    total_conversions?: number
    average_read_time: number
    resend_email_id?: string | null
    is_template?: boolean
    is_ready?: boolean
    sent_from_email?: string | null
    parent_template_id?: string | null
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

export type ChainProcessStatus = 'active' | 'paused' | 'cancelled' | 'completed'

export interface ChainProcessHistoryEntry {
    step_name: string
    action: string
    timestamp: string
    details?: string
}

export interface ChainProcess {
    id: string
    chain_id: string
    subscriber_id: string
    status: ChainProcessStatus
    current_step_index: number
    next_step_at: string | null
    history: ChainProcessHistoryEntry[]
    created_at: string
    updated_at: string
    // Joined fields for UI
    chain_name?: string
    chain_steps?: any[]
    chain_branches?: any[]
    subscriber_email?: string
    subscriber_first_name?: string
}
