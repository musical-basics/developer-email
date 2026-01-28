import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Initialize Admin Client (Service Key) to bypass RLS if needed
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Keep existing helper
function cleanJson(text: string) {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

// Helper: Download image from URL and convert to Base64
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

export async function POST(req: Request) {
    try {
        const { currentHtml, messages, model } = await req.json();

        // 1. FETCH CONTEXT FROM DB ⚡️
        const { data: setting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'company_context')
            .single();

        // Fallback if DB is empty
        const dynamicContext = setting?.value || "Product: DreamPlay One. Feature: Narrow Keys.";

        // 2. Process History: Convert ALL image URLs to Base64
        // We do this server-side so we don't hit the 4MB payload limit from the client.
        // We only keep the last 3 messages' images to save tokens/money, but we keep ALL text.
        const processedMessages = await Promise.all(messages.map(async (msg: any, index: number) => {
            const isRecent = index >= messages.length - 3; // Only keep images from last 3 messages

            let processedImages: any[] = [];

            if (isRecent && msg.imageUrls && msg.imageUrls.length > 0) {
                // Parallel download
                const downloads = await Promise.all(msg.imageUrls.map((url: string) => urlToBase64(url)));
                processedImages = downloads.filter(img => img !== null);
            }

            return {
                role: msg.role,
                content: msg.content,
                images: processedImages // Now contains { base64, mediaType }
            };
        }));

        const systemInstruction = `
    You are an expert Email HTML Developer.
    The user will give you HTML and a request.
    
    ### 🛑 CRITICAL INTEGRITY RULES:
    1. **NEVER DELETE CONTENT:** Unless explicitly asked to remove something, you must PRESERVE all existing sections, text, and images.
    2. **ADDING SECTIONS = FULL HTML:** If the user asks to "add", "insert", or "create" a new section/row/block, you MUST return the **COMPLETE HTML DOCUMENT** (starting with <!DOCTYPE html>). Do not return just the snippet, or the system will overwrite the wrong block.
    3. **EDITING TEXT = SNIPPET:** Only if the user asks to typo-fix or rephrase *specific text inside the current block*, should you return just that HTML block. When in doubt, RETURN THE FULL HTML.
    
    ### CODING STANDARDS:
    1. **LAYOUT:** Use HTML <table>, <tr>, <td> for structure. No Flexbox/Grid.
    2. **WIDTHS:** Explicitly set width="100%" or specific pixels.
    3. **VARIABLES:** Preserve {{mustache_vars}}.
    
    ### RESPONSE FORMAT:
    { "explanation": "brief summary of changes", "updatedHtml": "<html>...</html>" }
    
    ### COMPANY CONTEXT:
    ${dynamicContext}
    `;

        let rawResponse = "";

        // --- A. CLAUDE (Anthropic) ---
        if (model.includes("claude")) {
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

            const anthropicMessages = processedMessages.map((msg: any) => {
                const role = (msg.role === 'result' ? 'assistant' : 'user') as "assistant" | "user";
                let content: any[] = [];

                // Add Images
                if (msg.images) {
                    msg.images.forEach((img: any) => {
                        content.push({
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: img.mediaType,
                                data: img.base64
                            }
                        });
                    });
                }

                // Add Text
                if (msg.content) content.push({ type: "text", text: msg.content });

                return { role, content };
            });

            // Append Context to Last Message
            const lastMsg = anthropicMessages[anthropicMessages.length - 1];
            if (lastMsg.role === 'user') {
                lastMsg.content.push({ type: "text", text: `\n\n### CURRENT HTML:\n${currentHtml}` });
            }

            const msg = await anthropic.messages.create({
                model: model, // Use the model passed from frontend
                max_tokens: 8192,
                temperature: 0,
                system: systemInstruction,
                messages: anthropicMessages
            });

            const textBlock = msg.content[0];
            if (textBlock.type === 'text') rawResponse = textBlock.text;
        }

        // --- B. GEMINI (Google) ---
        else {
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
                        parts.push({
                            inlineData: {
                                mimeType: img.mediaType,
                                data: img.base64
                            }
                        });
                    });
                }

                if (msg.content) parts.push({ text: msg.content });
                return { role, parts };
            });

            const lastMsg = geminiHistory[geminiHistory.length - 1];
            lastMsg.parts.push({ text: `\n\n### CURRENT HTML:\n${currentHtml}` });

            // Inject system instruction into first message
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

        // --- PARSE ---
        try {
            const cleaned = cleanJson(rawResponse);
            return NextResponse.json(JSON.parse(cleaned));
        } catch (e) {
            return NextResponse.json({ updatedHtml: currentHtml, explanation: rawResponse });
        }

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
