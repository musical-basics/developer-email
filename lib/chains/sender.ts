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

/**
 * JIT AI Email Sender — generates a bespoke 1:1 email using Claude,
 * sends via Resend, and logs a jit_email_sent event.
 */
export async function generateAndSendJITEmail(subscriberId: string, contextPrompt: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Fetch subscriber profile
    const { data: subscriber, error } = await supabase
        .from("subscribers")
        .select("id, email, first_name, last_name, location_country, tags, smart_tags")
        .eq("id", subscriberId)
        .eq("status", "active")
        .single();

    if (error || !subscriber) {
        console.error("JIT: Subscriber not found or inactive:", subscriberId);
        return { success: false, error: "Subscriber not found" };
    }

    const firstName = subscriber.first_name || "there";
    const country = subscriber.location_country || "Unknown";

    // 2. Generate email copy via Claude
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 400,
        system: `You are Lionel Yu, founder of DreamPlay Pianos. You write warm, personal emails that feel like they come from a real person, not a marketing department. Never sound creepy, never mention tracking or data. Keep it under 4 sentences. Write only the email body text, no subject line.`,
        messages: [{
            role: "user",
            content: `Write a personal 1-to-1 email to ${firstName}. Context: ${contextPrompt}. Their Country: ${country}.`
        }]
    });

    const emailBody = (msg.content[0] as any).text || "";

    // 3. Wrap in HTML
    const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${subscriber.id}`;
    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333; line-height: 1.7;">
${emailBody.split("\n").filter((l: string) => l.trim()).map((p: string) => `<p style="margin: 0 0 16px 0;">${p}</p>`).join("\n")}
<p style="margin: 24px 0 0 0; color: #666;">Best,<br>Lionel</p>
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
  <p style="margin: 0;">No longer want to receive these emails? <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.</p>
</div>
</body>
</html>`;

    // 4. Send via Resend
    const sendResult = await resend.emails.send({
        from: "Lionel Yu <lionel@email.dreamplaypianos.com>",
        to: subscriber.email,
        subject: `Quick note, ${firstName}`,
        html,
        headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    });

    if (sendResult.error) {
        console.error("JIT send error:", sendResult.error);
        return { success: false, error: sendResult.error.message };
    }

    // 5. Log the JIT send event
    await supabase.from("subscriber_events").insert({
        subscriber_id: subscriberId,
        type: "sent",
        metadata: { chain: "jit", context: contextPrompt.slice(0, 200) },
    });

    return { success: true, email: subscriber.email };
}
