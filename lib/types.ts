export type CampaignStatus = 'draft' | 'active' | 'completed'

export interface Campaign {
    id: number
    created_at: string
    name: string
    subject_line: string | null
    html_content: string | null
    variable_values: Record<string, any> | null
    status: CampaignStatus
}
