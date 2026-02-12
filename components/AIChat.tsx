import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { generateAIAnswer, ImagePart, generateSpeech, decodeAudioData } from '../services/geminiService';
import { Theme } from './ThemeSelector';
import ChatWindow from './unified/ChatWindow';
import { Message as UnifiedMessage } from './unified/MessageBubble';

interface AIChatProps {
  user: User;
  voiceMode: boolean;
  onLogout: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const AIChat: React.FC<AIChatProps> = ({ user }) => {
  // Load initial messages from localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('eiva-ai-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Speech & Audio refs (kept for future feature re-integration if needed by ChatWindow)
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('eiva-ai-history', JSON.stringify(messages));
  }, [messages]);


  const handleSpeak = async (msgId: string, text: string) => {
    // ... (Keep existing speech logic if we want to pass it down, 
    // but ChatWindow doesn't support specific speech actions per bubble yet without customization.
    // For now, we'll auto-speak if enabled, similar to before)
    const speechData = await generateSpeech(text);
    if (!speechData) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const buffer = await decodeAudioData(speechData, audioContextRef.current);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start();
    audioSourceRef.current = source;
  };

  const handleSend = async (text: string, attachments?: File[]) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;
    if (isLoading) return;

    const userMsgId = Date.now().toString();
    let userImagePart: ImagePart | undefined = undefined;

    // Handle single image attachment for Gemini (current limitation: 1 image)
    if (attachments && attachments.length > 0) {
      const file = attachments[0]; // Take first file
      if (file.type.startsWith('image/')) {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        userImagePart = { inlineData: { data: base64Data, mimeType: file.type } };
      }
    }

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      parts: [
        { text: text.trim() },
        ...(userImagePart ? [{ inlineData: userImagePart.inlineData }] : [])
      ],
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const response = await generateAIAnswer(text.trim(), userImagePart);
      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'model',
        parts: [{ text: response.text }],
        timestamp: new Date().toISOString(),
        sources: response.sources
      };
      setMessages(prev => [...prev, aiMsg]);

      //   if (voiceMode && response.text) {
      //     handleSpeak(aiMsg.id, response.text);
      //   }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'model',
        parts: [{ text: "Connection severed. Neural link unstable." }],
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert ChatMessage to UnifiedMessage
  const unifiedMessages: UnifiedMessage[] = messages.map(msg => ({
    id: msg.id,
    text: msg.parts.map(p => p.text).join('\n') || '', // Combine text parts
    sender: msg.role === 'user' ? 'me' : 'other',
    timestamp: new Date(msg.timestamp),
    senderName: msg.role === 'user' ? user.name : 'EIVA AI',
    senderAvatar: msg.role === 'user' ? user.avatar : undefined,
    attachments: msg.parts
      .filter(p => p.inlineData)
      .map(p => ({
        type: 'image',
        url: `data:${p.inlineData!.mimeType};base64,${p.inlineData!.data}`
      }))
  }));

  return (
    <ChatWindow
      chatPartner="eiva"
      messages={unifiedMessages}
      onSendMessage={handleSend}
      isTyping={isLoading}
    />
  );
};

export default AIChat;

