import { GoogleGenAI, Modality, FunctionDeclaration } from "@google/genai";
import { AGENTS, Agent } from "./agentConfig";

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface AIResponse {
  text: string;
  agentName?: string;
  sources?: any[];
}

// Instantiate fresh client to ensure the most up-to-date API key is used
const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Router Function: Decides which agent should handle the query
const determineAgent = async (prompt: string): Promise<Agent> => {
  const ai = getAI();
  const routerPrompt = `
    You are EIVA Core, the intelligent router.
    Analyze the following user query and decide which specialized agent should handle it.
    
    Available Agents:
    - CODE_EXPLAINER: For programming code, debugging, output prediction, and code logic.
    - NOTES_GENERATOR: For creating exam notes, summaries, bullet points.
    - VIVA_QUESTION: For oral exam questions, interview prep, short QA.
    - STUDY_PLANNER: For timetables, schedules, study advice.
    - ASSIGNMENT_ASSISTANT: For writing essays, assignments, structuring papers.
    - GENERAL: For casual chat, greetings, or anything not fitting the above.

    User Query: "${prompt}"

    Return ONLY the Agent ID (e.g., CODE_EXPLAINER) as a plain string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Stable model for routing
      contents: [{ parts: [{ text: routerPrompt }] }],
    });

    const decision = response.text?.trim().toUpperCase();
    console.log("EIVA Core Routing Decision:", decision);

    if (decision && AGENTS[decision]) {
      return AGENTS[decision];
    }
    return AGENTS.GENERAL;
  } catch (e) {
    console.error("Routing failed, defaulting to GENERAL", e);
    return AGENTS.GENERAL;
  }
};

// Standard AI Answer for Questions and Chat
export const generateAIAnswer = async (
  prompt: string,
  imagePart?: ImagePart
): Promise<AIResponse> => {
  const ai = getAI();

  // 1. Route to the correct agent
  const selectedAgent = await determineAgent(prompt);
  console.log(`Executing with Agent: ${selectedAgent.name}`);

  try {
    const contents = imagePart
      ? { parts: [imagePart, { text: prompt }] }
      : { parts: [{ text: prompt }] };

    // 2. Configure tools (Google Search)
    const tools = selectedAgent.supportsSearch ? [{ googleSearch: {} }] : [];

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Use 1.5 Flash for speed and stability
      contents,
      tools: tools as any, // Cast to any to avoid strict type issues with googleSearch
      config: {
        temperature: 0.7,
        systemInstruction: selectedAgent.instruction
      }
    });

    // Extract grounding metadata if available (search sources)
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text: response.text || "I'm sorry, I couldn't generate an answer for that.",
      agentName: selectedAgent.name,
      sources
    };
  } catch (error) {
    console.error("Gemini Gen Error:", error);
    return { text: "Transmission error. Please try again later.", agentName: "System Error" };
  }
};

// Professional Speech Generation (TTS)
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return undefined;
  }
};

// Audio Decoding Helper for Raw PCM from Gemini TTS
export async function decodeAudioData(
  base64: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const dataInt16 = new Int16Array(bytes.buffer);
  const numChannels = 1;
  const sampleRate = 24000; // Gemini TTS default
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
