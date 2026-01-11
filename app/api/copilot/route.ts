import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

function cleanJson(text: string) {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function POST(req: Request) {
    try {
        const { currentHtml, prompt, model } = await req.json();

        console.log(`🤖 Copilot using model: ${model}`); // Debug log

        const systemInstruction = `
    You are an expert Email HTML Developer. Your job is to modify the user's HTML code based on their request.
    ### CRITICAL RULES:
    1. **NO LAZINESS:** Return the FULL HTML. No placeholders.
    2. **PRESERVE VARIABLES:** Keep {{mustache_vars}} intact.
    3. **VALID JSON:** Output strictly valid JSON.
    ### RESPONSE FORMAT:
    { "explanation": "string", "updatedHtml": "string" }
    `;

        let rawResponse = "";

        // --- A. CLAUDE ---
        if (model.includes("claude")) {
            const msg = await anthropic.messages.create({
                // ⚡️ FIX: Use the 'model' variable directly. Do not hardcode "claude-3-5..."
                model: model,
                max_tokens: 8192,
                temperature: 0,
                system: systemInstruction,
                messages: [
                    {
                        role: "user",
                        content: `### CURRENT HTML:\n${currentHtml}\n\n### USER REQUEST:\n${prompt}`
                    }
                ]
            });

            const textBlock = msg.content[0];
            if (textBlock.type === 'text') {
                rawResponse = textBlock.text;
            }
        }

        // --- B. GEMINI ---
        else {
            // ⚡️ FIX: Pass the 'model' variable directly here too
            const geminiModel = genAI.getGenerativeModel({
                model: model,
                generationConfig: { responseMimeType: "application/json" }
            });

            const fullPrompt = `
      ${systemInstruction}
      ### CURRENT HTML:
      ${currentHtml}
      ### USER REQUEST:
      ${prompt}
      `;

            const result = await geminiModel.generateContent(fullPrompt);
            rawResponse = result.response.text();
        }

        // --- CLEAN & PARSE ---
        try {
            const cleanedJson = cleanJson(rawResponse);
            const data = JSON.parse(cleanedJson);
            return NextResponse.json(data);
        } catch (parseError) {
            console.error("JSON Parse Error. AI Output:", rawResponse);
            return NextResponse.json(
                { error: "AI returned invalid JSON. Check server logs." },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("AI API Error:", error);
        // Return the actual error message so we can see it in the UI
        return NextResponse.json(
            { error: error.message || "Failed to process request" },
            { status: 500 }
        );
    }
}
