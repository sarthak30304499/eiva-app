
import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { generateAIAnswer, ImagePart, generateSpeech, decodeAudioData } from '../services/geminiService';

interface AIChatProps {
  user: User;
  voiceMode: boolean;
  onLogout: () => void;
  onReturnToChoice: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ user, voiceMode, onLogout, onReturnToChoice }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages, isLoading]);

  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setInput(prev => (prev + ' ' + transcript).trim());
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);

      recognitionRef.current.onerror = (event: any) => {
        console.error("AIChat Speech Error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError("Microphone access denied.");
          alert("Please allow microphone access to use voice input.");
        } else if (event.error === 'no-speech') {
          // ignore
        } else {
          setSpeechError("Voice error: " + event.error);
        }
      };

    } else {
      console.warn("Speech Recognition not supported in this browser.");
    }
  }, []);

  const toggleListening = () => {
    setSpeechError(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e: any) {
          if (e.name === 'InvalidStateError' || e.message?.includes('already started')) {
            console.log("AIChat: Recognition already active");
            setIsListening(true);
          } else {
            console.error("Start listening error:", e);
            setIsListening(false);
            setSpeechError("Could not start microphone.");
          }
        }
      } else {
        alert("Speech Recognition is not supported in this browser. Please use Chrome.");
      }
    }
  };

  const handleSpeak = async (msgId: string, text: string) => {
    if (playingMessageId === msgId) {
      audioSourceRef.current?.stop();
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(msgId);
    const speechData = await generateSpeech(text);
    if (!speechData) {
      setPlayingMessageId(null);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const buffer = await decodeAudioData(speechData, audioContextRef.current);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setPlayingMessageId(null);
    source.start();
    audioSourceRef.current = source;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMsgId = Date.now().toString();
    let userImagePart: ImagePart | undefined = undefined;

    if (selectedFile) {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });
      userImagePart = { inlineData: { data: base64Data, mimeType: selectedFile.type } };
    }

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      parts: [
        { text: input.trim() },
        ...(userImagePart ? [{ inlineData: userImagePart.inlineData }] : [])
      ],
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    const currentInput = input;
    setInput('');
    removeFile();
    if (isListening) recognitionRef.current?.stop();

    try {
      const response = await generateAIAnswer(currentInput, userImagePart);
      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'model',
        parts: [{ text: response.text }],
        timestamp: new Date().toISOString(),
        agentName: response.agentName,
        sources: response.sources
      };
      setMessages(prev => [...prev, aiMsg]);

      // Auto-play if Voice Mode is ON
      if (voiceMode && response.text) {
        handleSpeak(aiMsg.id, response.text);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'model',
        parts: [{ text: "Error connecting to EIVA intelligence. Please check your network." }],
        timestamp: new Date().toISOString(),
        agentName: 'System Error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] bg-gray-50 dark:bg-gray-950 overflow-hidden font-['Plus_Jakarta_Sans']">
      <main className="flex-1 flex flex-col relative max-w-4xl mx-auto w-full bg-white dark:bg-gray-900 shadow-xl">
        <header className="px-6 py-4 border-b dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">✨</span>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">EIVA Chat Station</h2>
          </div>
          <button onClick={onReturnToChoice} className="text-xs font-bold text-[#6C63FF] hover:underline">Change Mode</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <span className="text-6xl mb-4">🚀</span>
              <p className="font-bold text-sm tracking-widest uppercase">Awaiting Transmission</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-1`}>
                <div className={`p-4 rounded-2xl relative group/msg ${msg.role === 'user'
                  ? 'bg-[#6C63FF] text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border dark:border-gray-700'
                  }`}>
                  {msg.parts.map((part, i) => (
                    <div key={i} className="space-y-2">
                      {part.inlineData && (
                        <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="rounded-lg max-h-60 object-cover border dark:border-gray-600" />
                      )}
                      {part.text && <div className="text-sm leading-relaxed">{part.text}</div>}
                    </div>
                  ))}

                  {msg.role === 'model' && msg.parts[0]?.text && (
                    <button
                      onClick={() => handleSpeak(msg.id, msg.parts[0].text!)}
                      className={`absolute -right-10 top-2 p-1.5 rounded-full shadow-sm transition-all opacity-0 group-hover/msg:opacity-100 ${playingMessageId === msg.id ? 'bg-[#6C63FF] text-white animate-pulse opacity-100' : 'bg-white dark:bg-gray-700 text-[#6C63FF] border dark:border-gray-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className={`p-1 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    {msg.role === 'user' ? user.username : 'EIVA'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-8 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-3xl mx-auto relative">
            {previewUrl && (
              <div className="absolute bottom-full left-0 mb-4 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 flex items-center space-x-3 animate-slide-up">
                <img src={previewUrl} className="w-12 h-12 rounded-lg object-cover" />
                <button onClick={removeFile} className="text-red-500 text-[10px] font-bold uppercase">Discard</button>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-2 flex items-center border-2 border-transparent focus-within:border-[#6C63FF] transition-all">
              <button
                onClick={toggleListening}
                className={`p-3 rounded-full transition-all ${isListening ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse' : 'text-gray-400 hover:text-[#6C63FF]'}`}
                title={isListening ? 'Stop listening' : 'Voice Input'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z" />
                </svg>
              </button>

              {speechError && (
                <div className="absolute bottom-full left-10 mb-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 animate-fade-in-down">
                  ⚠️ {speechError}
                </div>
              )}

              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-[#6C63FF]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={isListening ? "Listening..." : "Ask EIVA anything..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 resize-none max-h-32"
                rows={1}
              />

              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedFile)}
                className={`p-3 rounded-xl transition-all ${isLoading ? 'opacity-30' : 'text-[#6C63FF] hover:scale-110'}`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14m-7-7l7 7-7 7" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIChat;
