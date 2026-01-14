import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function cleanJson(text: string) {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function POST(req: Request) {
    try {
        const { currentHtml, messages, model } = await req.json(); // 'messages' is the full array

        const systemInstruction = `
    You are an expert Email HTML Developer.
    The user will give you HTML and a request (or a history of requests).
    Your job is to modify the code based on the *latest* request, while considering the context of previous messages.
    
    ### CRITICAL RULES:
    1. **NO LAZINESS:** Return the FULL HTML.
    2. **PRESERVE VARIABLES:** Keep {{mustache_vars}} intact.
    3. **VALID JSON:** Output strictly valid JSON.
    4. **LAYOUT RULE:** For columns, YOU MUST USE HTML TABLES (<table>, <tr>, <td>). Do NOT use 'display: flex' or 'grid' for structural layout, as they break in email clients.
    5. **WIDTHS:** Explicitly set widths (e.g., width="50%") on table cells to force them to sit side-by-side.
    
    ### RESPONSE FORMAT:
    { "explanation": "string", "updatedHtml": "string" }
    `;

        let rawResponse = "";

        // --- A. CLAUDE (Anthropic) ---
        if (model.includes("claude")) {

            // Convert frontend messages to Anthropic format
            const anthropicMessages = messages.map((msg: any) => {
                // Map 'result' role to 'assistant'
                const role = msg.role === 'result' ? 'assistant' : 'user';

                let content: any[] = [];

                // Add Images (if any)
                if (msg.images && msg.images.length > 0) {
                    msg.images.forEach((img: string) => {
                        const base64Data = img.split(",")[1];
                        const mediaType = img.split(";")[0].split(":")[1];
                        content.push({
                            type: "image",
                            source: { type: "base64", media_type: mediaType, data: base64Data }
                        });
                    });
                }

                // Add Text
                if (msg.content) {
                    content.push({ type: "text", text: msg.content });
                }

                return { role, content };
            });

            // Append the "Current Context" to the VERY LAST user message
            // We don't want to re-send the HTML 10 times in history, just the current state at the end.
            const lastMsgIndex = anthropicMessages.length - 1;
            const lastMsg = anthropicMessages[lastMsgIndex];

            if (lastMsg.role === 'user') {
                lastMsg.content.push({
                    type: "text",
                    text: `\n\n### CURRENT HTML STATE:\n${currentHtml}`
                });
            }

            const msg = await anthropic.messages.create({
                model: model,
                max_tokens: 8192,
                temperature: 0,
                system: systemInstruction,
                messages: anthropicMessages // Send the whole chain
            });

            const textBlock = msg.content[0];
            if (textBlock.type === 'text') rawResponse = textBlock.text;
        }

        // --- B. GEMINI (Google) ---
        else {
            const geminiModel = genAI.getGenerativeModel({
                model: model,
                generationConfig: { responseMimeType: "application/json" }
            });

            const geminiHistory = messages.map((msg: any) => {
                const role = msg.role === 'result' ? 'model' : 'user';
                const parts = [];

                if (msg.images && msg.images.length > 0) {
                    msg.images.forEach((img: string) => {
                        const base64Data = img.split(",")[1];
                        const mimeType = img.split(";")[0].split(":")[1];
                        parts.push({ inlineData: { mimeType, data: base64Data } });
                    });
                }

                if (msg.content) parts.push({ text: msg.content });
                return { role, parts };
            });

            // Attach Current HTML to the last message prompt
            const lastMsg = geminiHistory[geminiHistory.length - 1];
            lastMsg.parts.push({ text: `\n\n### CURRENT HTML STATE:\n${currentHtml}` });

            // For Gemini, we use 'generateContent' with the whole history as 'contents'
            // Note: We prepend system instruction inside the first turn or use systemInstruction config if available (Gemini 1.5 supports it in config, but keeping it simple here)

            // We'll wrap the system instruction into the first user message for guaranteed adherence
            geminiHistory[0].parts[0].text = `${systemInstruction}\n\n${geminiHistory[0].parts[0].text}`;

            const result = await geminiModel.generateContent({
                contents: geminiHistory
            });
            rawResponse = result.response.text();
        }

        // --- PARSE ---
        try {
            const cleanedJson = cleanJson(rawResponse);
            const data = JSON.parse(cleanedJson);
            return NextResponse.json(data);
        } catch (parseError) {
            return NextResponse.json({ error: "AI returned invalid JSON." }, { status: 500 });
        }

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
