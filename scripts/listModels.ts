
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function listModels() {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env");
        return;
    }

    console.log("Using API Key:", apiKey.substring(0, 10) + "...");

    const ai = new GoogleGenAI({ apiKey });

    try {
        // The new SDK structure might differ, checking standard list method
        // If this fails, we catch it.
        // Note: older SDKs used a different manager, but high-level GoogleGenAI might have it.
        // The @google/genai package is actually the NEW beta SDK often.
        // But commonly people use @google/generative-ai.
        // Let's check if we can access the model list.
        // Since we don't know the exact method signature for this specific version without docs,
        // we will try to make a raw request or use the models property if exposed.

        // For @google/generative-ai (if that's what it is masking as), it doesn't always expose listModels on the main client.
        // However, the error message "Call ListModels" implies a method exists.

        // Let's try to just use weight of evidence from the error message.
        // Actually, I'll switch to using the REST API directly to be 100% sure if the SDK is ambiguous.
        // REST API is easier to debug for listing models.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods?.join(", ")})`);
            });
        } else {
            console.error("Failed to list models:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
