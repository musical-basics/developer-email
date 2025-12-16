import { CampaignLaunchChecks } from "@/components/campaign/campaign-launch-checks"

// Mock campaign data - in production this would come from Supabase
const mockCampaign = {
  id: "campaign-123",
  name: "Summer Sale Newsletter",
  subject_line: "🎵 Don't Miss Our Summer Sale - Up to 50% Off!",
  status: "draft" as const,
  html_content: `
    <html>
      <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
          <img src="{{hero_image_url}}" alt="Summer Sale" style="width: 100%; height: auto;" />
          <div style="padding: 24px;">
            <h1 style="color: #1a1a1a; margin: 0 0 16px;">Summer Sale is Here!</h1>
            <p style="color: #666; line-height: 1.6;">Hi {{first_name}}, enjoy up to 50% off on all musical instruments.</p>
            <a href="{{cta_url}}" style="display: inline-block; background: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Shop Now</a>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
              <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `,
  variable_values: {
    hero_image_url: "/summer-sale-music-instruments.jpg",
    first_name: "John",
    cta_url: "https://example.com/summer-sale",
    unsubscribe_url: "https://example.com/unsubscribe",
  },
  from_name: "Lionel Yu",
  from_email: "lionel@musicalbasics.com",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-15T14:22:00Z",
}

const mockAudience = {
  total_subscribers: 1240,
  active_subscribers: 1240,
}

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const { id } = params

  // In production, fetch campaign from Supabase using the id
  const campaign = { ...mockCampaign, id }

  return <CampaignLaunchChecks campaign={campaign} audience={mockAudience} />
}
