import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderTemplate } from "@/lib/render-template";
import { injectPreheader } from "@/lib/email-preheader";
import { applyAllMergeTags } from "@/lib/merge-tags";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { rotationId, subscriberIds, fromName, fromEmail } = body;

        if (!rotationId || !subscriberIds || subscriberIds.length === 0) {
            return NextResponse.json({ error: "rotationId and subscriberIds are required" }, { status: 400 });
        }

        // 1. Fetch rotation
        const { data: rotation, error: rotError } = await supabaseAdmin
            .from("rotations")
            .select("*")
            .eq("id", rotationId)
            .single();

        if (rotError || !rotation) {
            return NextResponse.json({ error: "Rotation not found" }, { status: 404 });
        }

        const campaignIds: string[] = rotation.campaign_ids;
        const totalCampaigns = campaignIds.length;

        if (totalCampaigns === 0) {
            return NextResponse.json({ error: "Rotation has no campaigns" }, { status: 400 });
        }

        // 2. Fetch all template campaigns
        const { data: templates } = await supabaseAdmin
            .from("campaigns")
            .select("*")
            .in("id", campaignIds);

        if (!templates || templates.length === 0) {
            return NextResponse.json({ error: "Template campaigns not found" }, { status: 404 });
        }

        const templateMap = Object.fromEntries(templates.map(t => [t.id, t]));

        // 3. Fetch subscriber data
        const { data: subscribers } = await supabaseAdmin
            .from("subscribers")
            .select("*")
            .in("id", subscriberIds)
            .eq("status", "active");

        if (!subscribers || subscribers.length === 0) {
            return NextResponse.json({ error: "No active subscribers found" }, { status: 400 });
        }

        // 5. Round-robin assignment starting from cursor_position
        let cursor = rotation.cursor_position;
        const assignments: { subscriber: any; campaignId: string }[] = [];

        for (const sub of subscribers) {
            const assignedCampaignId = campaignIds[cursor % totalCampaigns];
            assignments.push({ subscriber: sub, campaignId: assignedCampaignId });
            cursor++;
        }

        // 6. Group by campaign and create child campaigns
        const grouped: Record<string, any[]> = {};
        for (const a of assignments) {
            if (!grouped[a.campaignId]) grouped[a.campaignId] = [];
            grouped[a.campaignId].push(a.subscriber);
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com";
        let totalSent = 0;
        let totalFailed = 0;
        const perCampaignStats: any[] = [];

        for (const [templateId, subs] of Object.entries(grouped)) {
            const template = templateMap[templateId];
            if (!template) continue;

            // Create child campaign for this batch
            const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const { data: child, error: childError } = await supabaseAdmin
                .from("campaigns")
                .insert({
                    name: `${template.name} — Rotation — ${today}`,
                    subject_line: template.subject_line,
                    html_content: template.html_content,
                    status: "draft",
                    is_template: false,
                    parent_template_id: templateId,
                    rotation_id: rotationId,
                    variable_values: (() => {
                        const { subscriber_id, subscriber_ids, ...rest } = template.variable_values || {};
                        return rest;
                    })(),
                })
                .select("id")
                .single();

            if (childError || !child) {
                console.error("Failed to create rotation child campaign:", childError);
                totalFailed += subs.length;
                continue;
            }

            // Render HTML from template
            const globalHtml = renderTemplate(template.html_content || "", template.variable_values || {});
            const htmlWithPreheader = injectPreheader(globalHtml, template.variable_values?.preview_text);

            const unsubscribeFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
  <p style="margin: 0;">
    No longer want to receive these emails? 
    <a href="{{unsubscribe_url}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.
  </p>
</div>
`;
            const htmlWithFooter = htmlWithPreheader + unsubscribeFooter;

            let campaignSent = 0;
            let campaignFailed = 0;
            const sentRecords: any[] = [];

            const senderFromName = fromName || template.variable_values?.from_name;
            const senderFromEmail = fromEmail || template.variable_values?.from_email;

            for (let i = 0; i < subs.length; i++) {
                const sub = subs[i];
                try {
                    const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${sub.id}&c=${child.id}`;
                    let personalHtml = await applyAllMergeTags(htmlWithFooter, sub, {
                        unsubscribe_url: unsubscribeUrl,
                        discount_code: template.variable_values?.discount_code || "",
                    });

                    // Append subscriber context to links
                    personalHtml = personalHtml.replace(/href=(["'])(https?:\/\/[^"']+)\1/g, (match, quote, url) => {
                        if (url.includes('/unsubscribe')) return match;
                        const sep = url.includes('?') ? '&' : '?';
                        return `href=${quote}${url}${sep}sid=${sub.id}&cid=${child.id}${quote}`;
                    });

                    const personalSubject = await applyAllMergeTags(template.subject_line || "", sub);

                    const { error } = await resend.emails.send({
                        from: senderFromName && senderFromEmail
                            ? `${senderFromName} <${senderFromEmail}>`
                            : (process.env.RESEND_FROM_EMAIL || "DreamPlay <hello@email.dreamplaypianos.com>"),
                        to: sub.email,
                        subject: personalSubject,
                        html: personalHtml,
                        headers: {
                            "List-Unsubscribe": `<${unsubscribeUrl}>`,
                            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                        },
                        click_tracking: false,
                        open_tracking: false,
                    } as any);

                    if (error) {
                        console.error(`Rotation send failed for ${sub.email}:`, error);
                        campaignFailed++;
                    } else {
                        campaignSent++;
                        sentRecords.push({
                            campaign_id: child.id,
                            subscriber_id: sub.id,
                            sent_at: new Date().toISOString(),
                            variant_sent: template.subject_line || null,
                        });
                    }
                } catch (e) {
                    console.error(`Rotation send error for ${sub.email}:`, e);
                    campaignFailed++;
                }

                // Rate limit
                if (i < subs.length - 1) {
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            // Insert sent history
            if (sentRecords.length > 0) {
                await supabaseAdmin.from("sent_history").insert(sentRecords);
            }

            // Update child campaign status
            await supabaseAdmin.from("campaigns").update({
                status: "completed",
                total_recipients: subs.length,
                sent_from_email: senderFromEmail || null,
                updated_at: new Date().toISOString(),
            }).eq("id", child.id);

            totalSent += campaignSent;
            totalFailed += campaignFailed;

            perCampaignStats.push({
                templateId,
                templateName: template.name,
                childCampaignId: child.id,
                sent: campaignSent,
                failed: campaignFailed,
            });
        }

        // 7. Advance cursor
        const newCursor = (rotation.cursor_position + subscribers.length) % totalCampaigns;
        await supabaseAdmin.from("rotations").update({
            cursor_position: newCursor,
            updated_at: new Date().toISOString(),
        }).eq("id", rotationId);

        const message = `Rotation send complete: ${totalSent} sent, ${totalFailed} failed.`;
        console.log(`✅ ${message}`);

        return NextResponse.json({
            success: true,
            message,
            stats: {
                sent: totalSent,
                failed: totalFailed,
                total: subscriberIds.length,
                perCampaign: perCampaignStats,
            },
        });
    } catch (error: any) {
        console.error("Rotation send error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
