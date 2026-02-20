// lib/chains/sender.ts
import { Resend } from "resend";
import { CHAIN_TEMPLATES } from "./templates";
import { createClient } from "@supabase/supabase-js";
import { renderTemplate } from "@/lib/render-template";

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com";

export async function sendChainEmail(subscriberId: string, email: string, firstName: string, templateKeyOrId: string) {
    let rawHtml = "";
    let subject = "";
    let campaignId = "";

    const template = CHAIN_TEMPLATES[templateKeyOrId as keyof typeof CHAIN_TEMPLATES];

    if (template) {
        // Legacy hardcoded template
        rawHtml = template.generateHtml(firstName || "there");
        subject = template.subject;
        campaignId = template.campaign_id;
    } else {
        // Dynamic Database Template — templateKeyOrId is a UUID
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
        const { data: dbTemplate, error } = await supabase
            .from("campaigns")
            .select("*")
            .eq("id", templateKeyOrId)
            .single();

        if (error || !dbTemplate) {
            console.error("Failed to load template for chain:", templateKeyOrId, error);
            return { success: false, campaignId: "", error: "Template not found" };
        }

        const vars: Record<string, string> = {
            ...dbTemplate.variable_values,
            first_name: firstName || "there",
            email: email,
        };
        rawHtml = renderTemplate(dbTemplate.html_content || "", vars);
        subject = dbTemplate.subject_line || "No Subject";
        campaignId = dbTemplate.id;
    }

    const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${subscriberId}&c=${campaignId}`;

    const unsubscribeFooter = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
          <p style="margin: 0;">No longer want to receive these emails? <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.</p>
        </div>
    `;

    let finalHtml = rawHtml + unsubscribeFooter;

    // Replace subscriber_id placeholder if present in links
    finalHtml = finalHtml.replace(/{{subscriber_id}}/g, subscriberId);

    // Auto-append sid and em to all links
    finalHtml = finalHtml.replace(/href=(["'])(https?:\/\/[^"']+)\1/g, (match, quote, url) => {
        if (url.includes('/unsubscribe')) return match;
        const sep = url.includes('?') ? '&' : '?';
        return `href=${quote}${url}${sep}sid=${subscriberId}&em=${encodeURIComponent(email)}${quote}`;
    });

    // Send Email
    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Lionel Yu <lionel@musicalbasics.com>",
        to: email,
        subject: subject,
        html: finalHtml,
        headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }
    });

    return { success: true, campaignId };
}
