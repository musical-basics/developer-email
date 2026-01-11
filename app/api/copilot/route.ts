import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// --- HELPER: Strip Markdown Formatting ---
// This fixes the "SyntaxError" when AI returns ```json ... ```
function cleanJson(text: string) {
    // Remove ```json at start, ``` at end, and trim whitespace
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function POST(req: Request) {
    try {
        const { currentHtml, prompt, model } = await req.json();

        console.log(`🤖 Copilot processing with model: ${model}`);

        const systemInstruction = `
    You are an expert Email HTML Developer. Your job is to modify the user's HTML code based on their request.

    ### CRITICAL RULES:
    1. **NO LAZINESS:** You must return the FULL, COMPLETE HTML string. Do not use placeholders like "<!-- ... -->" or "...".
    2. **PRESERVE VARIABLES:** Do NOT remove or modify existing Mustache variables like {{hero_image_url}} unless asked.
    3. **VALID JSON:** Your output must be a single valid JSON object.
    
    ### RESPONSE FORMAT:
    {
      "explanation": "A short, 1-sentence summary of what you changed.",
      "updatedHtml": "<!DOCTYPE html>..."
    }
    `;

        let rawResponse = "";

        // --- A. CLAUDE SONNET ---
        if (model.includes("claude")) {
            const msg = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 8192, // High limit for full HTML files
                temperature: 0,
                system: systemInstruction,
                messages: [
                    {
                        role: "user",
                        content: `### CURRENT HTML:\n${currentHtml}\n\n### USER REQUEST:\n${prompt}`
                    }
                ]
            });

            // Anthropic returns an array of content blocks
            const textBlock = msg.content[0];
            if (textBlock.type === 'text') {
                rawResponse = textBlock.text;
            }
        }

        // --- B. GEMINI (Pro or Flash) ---
        else {
            // Handle "Pro" vs "Flash" naming
            const geminiModelName = model.includes("pro") ? "gemini-1.5-pro" : "gemini-2.0-flash-exp";

            const geminiModel = genAI.getGenerativeModel({
                model: geminiModelName,
                generationConfig: {
                    responseMimeType: "application/json" // Gemini usually respects this, but we clean it anyway
                }
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

        // --- C. CLEAN & PARSE ---
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
        return NextResponse.json(
            { error: error.message || "Failed to process request" },
            { status: 500 }
        );
    }
}
