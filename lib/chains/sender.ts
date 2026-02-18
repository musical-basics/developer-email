// lib/chains/sender.ts
import { Resend } from "resend";
import { CHAIN_TEMPLATES } from "./templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com";

export async function sendChainEmail(subscriberId: string, email: string, firstName: string, templateKey: keyof typeof CHAIN_TEMPLATES) {
    const template = CHAIN_TEMPLATES[templateKey];
    const rawHtml = template.generateHtml(firstName || "there");

    const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${subscriberId}&c=${template.campaign_id}`;

    const unsubscribeFooter = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
          <p style="margin: 0;">No longer want to receive these emails? <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.</p>
        </div>
    `;

    let finalHtml = rawHtml + unsubscribeFooter;

    // Replace subscriber_id placeholder if present in links
    finalHtml = finalHtml.replace(/{{subscriber_id}}/g, subscriberId);

    // Send Email
    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Lionel Yu <lionel@musicalbasics.com>",
        to: email,
        subject: template.subject,
        html: finalHtml,
        headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }
    });

    return { success: true, campaignId: template.campaign_id };
}
