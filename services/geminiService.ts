import { GoogleGenAI, Modality } from "@google/genai";


export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

// Standard AI Answer for Questions and Chat
export const generateAIAnswer = async (
  prompt: string,
  imagePart?: ImagePart
): Promise<AIResponse> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return { text: "Configuration Error: API Key is missing. Please check your deployment settings.", agentName: "System" };
    }
    if (!apiKey.startsWith("AIza")) {
      // Warn but don't block, in case format changed, but it denotes a likely issue.
      console.warn("API Key does not start with AIza. It might be invalid.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents = imagePart
      ? { parts: [imagePart, { text: prompt }] }
      : { parts: [{ text: prompt }] };

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro-002",
      contents,
      config: {
        temperature: 0.7,
        systemInstruction: "You are EIVA, a helpful, intelligent assistant. Provide concise, accurate, and structured answers. You can analyze images if provided."
      }
    });

    return {
      text: response.text || "I'm sorry, I couldn't generate an answer for that.",
      agentName: 'EIVA',
      sources: []
    };
  } catch (error: any) {
    console.error("Gemini Gen Error:", error);
    const errorMessage = error.message || "Unknown error";
    return { text: `Connection Failed: ${errorMessage}`, agentName: "System Error" };
  }
};

// Professional Speech Generation (TTS)
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return undefined;

    const ai = new GoogleGenAI({ apiKey });
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
