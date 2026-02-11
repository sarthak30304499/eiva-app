
import { GoogleGenAI, Modality } from "@google/genai";

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

// Instantiate fresh client to ensure the most up-to-date API key is used
const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Standard AI Answer for Questions and Chat
export const generateAIAnswer = async (
  prompt: string,
  imagePart?: ImagePart
): Promise<{ text: string }> => {
  const ai = getAI();
  try {
    const contents = imagePart
      ? { parts: [imagePart, { text: prompt }] }
      : { parts: [{ text: prompt }] };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        temperature: 0.7,
        systemInstruction: "You are EIVA, a helpful assistant for a Q&A community. Provide concise, accurate, and structured answers. You can analyze images if provided."
      }
    });

    return {
      text: response.text || "I'm sorry, I couldn't generate an answer for that."
    };
  } catch (error) {
    console.error("Gemini Gen Error:", error);
    return { text: "Transmission error. Please try again later." };
  }
};

// Professional Speech Generation (TTS)
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
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
