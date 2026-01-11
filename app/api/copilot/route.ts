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
        const { currentHtml, prompt, model, images } = await req.json(); // images is string[] (base64)

        const systemInstruction = `
    You are an expert Email HTML Developer. 
    If the user provides an image, use it as a visual reference for how the email should look (colors, layout, spacing).
    
    ### CRITICAL RULES:
    1. **NO LAZINESS:** Return the FULL HTML.
    2. **PRESERVE VARIABLES:** Keep {{mustache_vars}} intact.
    3. **VALID JSON:** Output strictly valid JSON.
    
    ### RESPONSE FORMAT:
    { "explanation": "string", "updatedHtml": "string" }
    `;

        let rawResponse = "";

        // --- A. CLAUDE (Anthropic) ---
        if (model.includes("claude")) {
            // Build Content Array
            const userContent: any[] = [];

            // 1. Add Images (if any)
            if (images && images.length > 0) {
                images.forEach((img: string) => {
                    // Strip "data:image/png;base64," prefix
                    const base64Data = img.split(",")[1];
                    const mediaType = img.split(";")[0].split(":")[1];

                    userContent.push({
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: mediaType,
                            data: base64Data,
                        }
                    });
                });
            }

            // 2. Add Text Prompt + HTML
            userContent.push({
                type: "text",
                text: `### CURRENT HTML:\n${currentHtml}\n\n### USER REQUEST:\n${prompt}`
            });

            const msg = await anthropic.messages.create({
                model: model,
                max_tokens: 8192,
                temperature: 0,
                system: systemInstruction,
                messages: [{ role: "user", content: userContent }]
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

            const geminiContentParts: any[] = [];

            // 1. Add Images
            if (images && images.length > 0) {
                images.forEach((img: string) => {
                    const base64Data = img.split(",")[1];
                    const mimeType = img.split(";")[0].split(":")[1];

                    geminiContentParts.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    });
                });
            }

            // 2. Add Text
            geminiContentParts.push({
                text: `${systemInstruction}\n\n### CURRENT HTML:\n${currentHtml}\n\n### USER REQUEST:\n${prompt}`
            });

            const result = await geminiModel.generateContent({
                contents: [{ role: "user", parts: geminiContentParts }]
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
