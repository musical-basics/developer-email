import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { currentHtml, prompt } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const systemPrompt = `
    You are an expert Email HTML Developer. Your job is to modify the user's HTML code based on their request.

    ### CRITICAL RULES:
    1. **NO LAZINESS:** You must return the FULL, COMPLETE HTML string. Do not use placeholders like "<!-- ... -->" or "...".
    2. **PRESERVE VARIABLES:** Do NOT remove or modify existing Mustache variables like {{hero_image_url}} or {{cta_link}} unless explicitly asked to.
    3. **VALID JSON:** Your output must be a single valid JSON object.
    
    ### RESPONSE FORMAT:
    {
      "explanation": "A short, 1-sentence summary of what you changed (e.g. 'I changed the button to green.')",
      "updatedHtml": "<!DOCTYPE html><html>... (THE ENTIRE HTML CODE) ...</html>"
    }
    `;

        const fullPrompt = `
    ${systemPrompt}

    ### CURRENT HTML:
    ${currentHtml}

    ### USER REQUEST:
    ${prompt}
    `;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        // Parse the JSON response
        const data = JSON.parse(responseText);

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}
