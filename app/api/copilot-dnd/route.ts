import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

function cleanJson(text: string) {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function urlToBase64(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mediaType = response.headers.get('content-type') || 'image/jpeg';
        return { base64, mediaType };
    } catch (e) {
        console.error("Image fetch failed", e);
        return null;
    }
}

// Block type schema for the AI prompt
const BLOCK_SCHEMA = `
You MUST return blocks as a JSON array. Each block has this shape:
{ "id": "<unique-string>", "type": "<block_type>", "props": { ... } }

VALID BLOCK TYPES AND THEIR PROPS:

1. "heading" — { text: string, level: "h1"|"h2"|"h3", alignment: "left"|"center"|"right", color: "#hex", fontFamily: "Arial, Helvetica, sans-serif" }
2. "text" — { text: string, alignment: "left"|"center"|"right", color: "#hex", fontSize: number(px), lineHeight: number }
3. "image" — { src: "{{mustache_var}}", alt: string, width: number(px, max 600), height: "auto"|number, linkUrl: "{{mustache_var}}", alignment: "left"|"center"|"right" }
4. "button" — { text: string, url: "{{mustache_var}}", bgColor: "#hex", textColor: "#hex", borderRadius: number, alignment: "left"|"center"|"right", fullWidth: boolean, fontSize: number, paddingX: number, paddingY: number }
5. "divider" — { color: "#hex", thickness: number, widthPercent: number(0-100), style: "solid"|"dashed"|"dotted" }
6. "spacer" — { height: number(px) }
7. "social" — { networks: [{ platform: "facebook"|"instagram"|"twitter"|"youtube"|"linkedin"|"tiktok", url: string }], alignment: "left"|"center"|"right", iconSize: number }

RULES:
- All image src values MUST be mustache variables like {{hero_src}}, {{product_img}}, etc.
- All link URLs MUST be mustache variables like {{cta_link_url}}, {{hero_link_url}}
- All text/copy MUST be hardcoded (NOT mustache variables)
- Generate unique IDs for each block (e.g. "block-heading-1", "block-text-1")
- NO EM-DASHES in any text
`;

export async function POST(req: Request) {
    try {
        const { currentBlocks, messages, model } = await req.json();

        // Fetch context
        const [{ data: setting }, { data: linksSetting }] = await Promise.all([
            supabase.from('app_settings').select('value').eq('key', 'company_context').single(),
            supabase.from('app_settings').select('value').eq('key', 'default_links').single(),
        ]);

        const dynamicContext = setting?.value || "Product: DreamPlay One. Feature: Narrow Keys.";
        let defaultLinksBlock = "";
        try {
            const links = linksSetting?.value ? JSON.parse(linksSetting.value) : null;
            if (links) {
                const entries = Object.entries(links).filter(([_, v]) => v);
                if (entries.length > 0) {
                    defaultLinksBlock = `\n### DEFAULT LINKS:\nUse these URLs as defaults for button and link blocks. Use {{mustache}} variables that map to these.\n${entries.map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n`;
                }
            }
        } catch { }

        // Process images in messages
        const processedMessages = await Promise.all(messages.map(async (msg: any, index: number) => {
            const isRecent = index >= messages.length - 3;
            let processedImages: any[] = [];
            if (isRecent && msg.imageUrls && msg.imageUrls.length > 0) {
                const downloads = await Promise.all(msg.imageUrls.map((url: string) => urlToBase64(url)));
                processedImages = downloads.filter(img => img !== null);
            }
            return { role: msg.role, content: msg.content, images: processedImages };
        }));

        const systemInstruction = `
You are an expert Email Template Designer that builds emails using a BLOCK-BASED system.
The user will describe what they want, and you return a structured array of blocks.

${BLOCK_SCHEMA}

### RESPONSE FORMAT:
{ "explanation": "brief summary of what you created/changed", "blocks": [ ...array of block objects... ] }

### COMPANY CONTEXT:
${dynamicContext}
${defaultLinksBlock}

### CURRENT BLOCKS:
${JSON.stringify(currentBlocks, null, 2)}

When modifying existing blocks:
- PRESERVE all blocks that the user did not ask to change
- Use the same IDs for unchanged blocks
- Generate new IDs for new blocks
When creating from scratch, build a complete email with appropriate sections.
`;

        let rawResponse = "";

        if (model.includes("claude")) {
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

            const anthropicMessages = processedMessages.map((msg: any) => {
                const role = (msg.role === 'result' ? 'assistant' : 'user') as "assistant" | "user";
                let content: any[] = [];

                if (msg.images) {
                    msg.images.forEach((img: any) => {
                        const isPdf = img.mediaType === 'application/pdf';
                        content.push({
                            type: isPdf ? "document" : "image",
                            source: { type: "base64", media_type: img.mediaType, data: img.base64 }
                        });
                    });
                }

                if (msg.content) content.push({ type: "text", text: msg.content });
                return { role, content };
            });

            const msg = await anthropic.messages.create({
                model: model,
                max_tokens: 8192,
                temperature: 0,
                system: systemInstruction,
                messages: anthropicMessages
            });

            const textBlock = msg.content[0];
            if (textBlock.type === 'text') rawResponse = textBlock.text;
        } else {
            // Gemini fallback — use same structure
            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const geminiModel = genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                generationConfig: { responseMimeType: "application/json" }
            });

            const geminiHistory = processedMessages.map((msg: any) => {
                const role = msg.role === 'result' ? 'model' : 'user';
                const parts = [];
                if (msg.images) {
                    msg.images.forEach((img: any) => {
                        parts.push({ inlineData: { mimeType: img.mediaType, data: img.base64 } });
                    });
                }
                if (msg.content) parts.push({ text: msg.content });
                return { role, parts };
            });

            if (geminiHistory.length > 0) {
                const firstPart = geminiHistory[0].parts[0];
                if (firstPart.text) {
                    firstPart.text = `${systemInstruction}\n\n${firstPart.text}`;
                } else {
                    geminiHistory[0].parts.unshift({ text: systemInstruction });
                }
            }

            const result = await geminiModel.generateContent({ contents: geminiHistory });
            rawResponse = result.response.text();
        }

        // Parse response
        try {
            const cleaned = cleanJson(rawResponse);
            const parsed = JSON.parse(cleaned);
            return NextResponse.json(parsed);
        } catch (e) {
            return NextResponse.json({ blocks: currentBlocks, explanation: rawResponse });
        }

    } catch (error: any) {
        console.error("DnD Copilot API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
