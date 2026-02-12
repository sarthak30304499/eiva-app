
import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { generateAIAnswer, ImagePart, generateSpeech, decodeAudioData } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThemeSelector, { Theme } from './ThemeSelector';

interface AIChatProps {
  user: User;
  voiceMode: boolean;
  onLogout: () => void;
  onReturnToChoice: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const AIChat: React.FC<AIChatProps> = ({ user, voiceMode, onLogout, onReturnToChoice, theme, setTheme }) => {
  // Load initial messages from localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('eiva-ai-history');
    return saved ? JSON.parse(saved) : [];
  });
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

  // Save to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('eiva-ai-history', JSON.stringify(messages));
  }, [messages]);

  const [speechError, setSpeechError] = useState<string | null>(null);

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      localStorage.removeItem('eiva-ai-history');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: Show a toast or temporary "Copied!" state
  };

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
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };


  const getThemeBackground = () => {
    switch (theme) {
      case 'space':
        return 'galaxy-bg';
      case 'snow':
        return 'snow-bg';
      case 'fire':
        return 'fire-bg';
      case 'wind':
        return 'wind-bg';
      default:
        return 'galaxy-bg';
    }
  };

  return (
    <div className={`flex h-[calc(100vh-56px)] ${getThemeBackground()} relative overflow-hidden font-['Plus_Jakarta_Sans'] transition-all duration-700`}>

      {/* Theme Specific Elements */}
      {theme === 'space' && <div className="stars"></div>}

      {theme === 'snow' && (
        <>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, opacity: Math.random() }}>❄</div>
          ))}
        </>
      )}

      {theme === 'fire' && (
        <>
          {[...Array(30)].map((_, i) => (
            <div key={i} className="ember" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, width: `${Math.random() * 6 + 2}px` }}></div>
          ))}
        </>
      )}

      {theme === 'wind' && (
        <>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="breeze" style={{ top: `${Math.random() * 80 + 10}%`, animationDelay: `${Math.random() * 3}s` }}></div>
          ))}
        </>
      )}

      {/* Decorative Planets/Orbs (Only for Space/Cyber look) */}
      {theme === 'space' && (
        <>
          <div className="absolute top-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </>
      )}

      <main className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full z-10">
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            {/* Empty top left for clean look, or maybe just a small logo if needed */}
          </div>
          <div className="flex items-center space-x-2 pointer-events-auto bg-black/40 backdrop-blur-md rounded-full p-1 pl-4 border border-white/10">
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest mr-2">EIVA</span>
            <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
            <div className="w-px h-4 bg-white/10 mx-2"></div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="px-3 py-1.5 rounded-full hover:bg-white/10 text-xs font-bold text-red-300 transition-all mr-2"
              >
                Clear
              </button>
            )}
            <button
              onClick={onReturnToChoice}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all"
            >
              Exit
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-60 animate-fade-in">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 floating backdrop-blur-sm border border-white/10">
                <span className="text-5xl">
                  {theme === 'space' ? '🌌' : theme === 'snow' ? '❄️' : theme === 'fire' ? '🔥' : '💨'}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">EIVA ONLINE</h3>
              <p className="text-blue-200 font-medium text-sm tracking-widest uppercase">Awaiting Transmission...</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
              <div className={`max-w-[85%] md:max-w-[70%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-[#6C63FF] to-[#00C6FF] border-transparent text-white'
                  : 'bg-black/40 border-white/20 text-white backdrop-blur-md'
                  }`}>
                  {msg.role === 'user' ? user.username[0].toUpperCase() : '✨'}
                </div>

                <div className="space-y-1">
                  <div className={`p-5 rounded-2xl relative backdrop-blur-md border ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#6C63FF]/90 to-[#00C6FF]/90 text-white border-white/10 shadow-lg shadow-purple-500/20 rounded-tr-none'
                    : 'bg-black/40 text-gray-100 border-white/10 shadow-xl rounded-tl-none'
                    }`}>

                    {msg.parts.map((part, i) => (
                      <div key={i} className="space-y-3">
                        {part.inlineData && (
                          <div className="relative group/image overflow-hidden rounded-lg border border-white/10">
                            <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-h-64 object-cover w-full transition-transform group-hover/image:scale-105" />
                          </div>
                        )}
                        {part.text && (
                          <div className={`text-sm leading-7 tracking-wide ${msg.role === 'model'
                            ? 'prose prose-invert prose-p:my-1 prose-headings:text-white prose-a:text-blue-300 prose-code:text-blue-200 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10'
                            : 'font-medium'
                            }`}>
                            {msg.role === 'model' ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                      <div className="relative group/code my-4">
                                        <div className="absolute right-2 top-2 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                                            className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2 py-1 rounded border border-white/20 backdrop-blur-md"
                                          >
                                            Copy
                                          </button>
                                        </div>
                                        <pre className={className}>
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        </pre>
                                      </div>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    )
                                  }
                                }}
                              >
                                {part.text}
                              </ReactMarkdown>
                            ) : (
                              part.text
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Speak Button for AI */}
                    {msg.role === 'model' && msg.parts[0]?.text && (
                      <button
                        onClick={() => handleSpeak(msg.id, msg.parts[0].text!)}
                        className={`absolute -right-12 top-0 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 ${playingMessageId === msg.id ? 'bg-[#6C63FF] text-white animate-pulse opacity-100' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title="Read Aloud"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest opacity-40 text-white ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-6 pb-8">
          <div className="max-w-3xl mx-auto relative">
            {previewUrl && (
              <div className="absolute bottom-full left-0 mb-4 p-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex items-center space-x-4 animate-slide-up">
                <img src={previewUrl} className="w-16 h-16 rounded-lg object-cover border border-white/20" />
                <div>
                  <p className="text-xs font-bold text-white mb-1">Image Attached</p>
                  <button onClick={removeFile} className="text-red-400 text-[10px] font-black uppercase hover:text-red-300 transition-colors">Discard</button>
                </div>
              </div>
            )}

            <div className="bg-[#1e1e1e]/80 backdrop-blur-xl rounded-2xl p-2 flex items-end border border-white/10 shadow-2xl ring-1 ring-white/5 focus-within:ring-purple-500/50 transition-all">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors mb-0.5"
                title="Upload Image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-base py-3 px-2 text-white placeholder-gray-500 resize-none max-h-48 min-h-[48px] leading-relaxed scrollbar-hide"
                rows={1}
                style={{ height: 'auto', minHeight: '44px' }}
              />

              <div className="flex items-center space-x-1 mb-0.5">
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  title={isListening ? 'Stop listening' : 'Voice Input'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  </svg>
                </button>

                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedFile)}
                  className={`p-3 rounded-xl transition-all ${isLoading || (!input.trim() && !selectedFile) ? 'opacity-30 cursor-not-allowed bg-white/5 text-gray-400' : 'bg-white text-black hover:scale-105 shadow-lg shadow-white/10'}`}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" /></svg>
                  )}
                </button>
              </div>

              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

              {speechError && (
                <div className="absolute bottom-full left-10 mb-2 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50 animate-fade-in-down font-bold">
                  ⚠️ {speechError}
                </div>
              )}
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-2 font-medium">EIVA can make mistakes. Consider checking important information.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIChat;
