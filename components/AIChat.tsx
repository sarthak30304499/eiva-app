
import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { generateAIAnswer, ImagePart, generateSpeech, decodeAudioData } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThemeSelector, { Theme } from './ThemeSelector';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, Image as ImageIcon, X,
  Terminal, Cpu, Zap, Copy, Volume2,
  StopCircle, Sparkles, MessageSquare,
  User as UserIcon
} from 'lucide-react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages, isLoading]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('eiva-ai-history', JSON.stringify(messages));
  }, [messages]);

  const [speechError, setSpeechError] = useState<string | null>(null);

  const clearChat = () => {
    if (confirm('Are you sure you want to purge the neural archives?')) {
      setMessages([]);
      localStorage.removeItem('eiva-ai-history');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

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
        } else {
          setSpeechError("Voice error: " + event.error);
        }
      };

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
          setIsListening(true);
        }
      } else {
        alert("Speech Recognition requires Chrome.");
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

      if (voiceMode && response.text) {
        handleSpeak(aiMsg.id, response.text);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'model',
        parts: [{ text: "Connection severed. Neural link unstable." }],
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };


  const getThemeBackground = () => {
    switch (theme) {
      case 'space': return 'galaxy-bg';
      case 'snow': return 'snow-bg';
      case 'fire': return 'fire-bg';
      case 'wind': return 'wind-bg';
      default: return 'galaxy-bg';
    }
  };

  return (
    <div className={`flex h-[calc(100vh-56px)] ${getThemeBackground()} relative overflow-hidden font-['Plus_Jakarta_Sans'] transition-all duration-700`}>

      {/* Dynamic Background Elements */}
      {theme === 'space' && <div className="stars-static inset-0 absolute opacity-30"></div>}

      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[100px] animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-blue-600/10 blur-[80px] animate-pulse-glow delay-1000 pointer-events-none" />

      <main className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full z-10">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-20 pointer-events-none">
          <div className="pointer-events-auto"></div>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-3 pointer-events-auto glass-dark rounded-full p-1.5 pl-5 shadow-2xl"
          >
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mr-2">EIVA SYSTEM</span>
            <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 rounded-full hover:bg-white/10 text-red-400 transition-colors"
                title="Purge Memory"
              >
                <X size={14} strokeWidth={3} />
              </button>
            )}
            <button
              onClick={onReturnToChoice}
              className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all hover:scale-105"
            >
              Exit
            </button>
          </motion.div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="h-full flex flex-col items-center justify-center text-center p-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center mb-8 relative"
                >
                  <div className="absolute inset-0 rounded-full border-t border-purple-500/50" />
                  <div className="absolute inset-2 rounded-full border-b border-blue-500/50" />
                  <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {theme === 'space' ? '🌌' : theme === 'snow' ? '❄️' : theme === 'fire' ? '🔥' : '💨'}
                  </span>
                </motion.div>
                <h3 className="text-4xl font-black text-white mb-3 tracking-tighter mix-blend-overlay">EIVA ONLINE</h3>
                <p className="text-blue-200/50 font-medium text-xs tracking-[0.3em] uppercase">System Ready // Awaiting Input</p>
              </motion.div>
            )}

            {messages.map((msg, index) => (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`max-w-[90%] md:max-w-[75%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-lg ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                    : 'glass-dark text-cyan-300'
                    }`}>
                    {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className={`p-6 rounded-3xl relative backdrop-blur-md shadow-xl border ${msg.role === 'user'
                      ? 'bg-indigo-600/80 text-white border-white/10 rounded-tr-sm'
                      : 'glass-dark text-gray-100 border-white/5 rounded-tl-sm'
                      }`}>

                      {msg.parts.map((part, i) => (
                        <div key={i} className="space-y-4">
                          {part.inlineData && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="relative overflow-hidden rounded-xl border border-white/10 group/img"
                            >
                              <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-h-80 w-full object-cover transition-transform duration-500 group-hover/img:scale-105" />
                            </motion.div>
                          )}

                          {part.text && (
                            <div className={`text-[15px] leading-7 tracking-wide ${msg.role === 'model'
                              ? 'prose prose-invert prose-p:my-2 prose-headings:text-white prose-a:text-cyan-300 prose-code:text-purple-200 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl'
                              : ''
                              }`}>
                              {msg.role === 'model' ? (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                      const match = /language-(\w+)/.exec(className || '')
                                      return !inline && match ? (
                                        <div className="relative group/code my-4">
                                          <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                            <button
                                              onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                              title="Copy Code"
                                            >
                                              <Copy size={14} />
                                            </button>
                                          </div>
                                          <pre className={`${className} bg-black/40 !p-4 !rounded-xl border border-white/10 shadow-inner`}>
                                            <code className={className} {...props}>{children}</code>
                                          </pre>
                                        </div>
                                      ) : (
                                        <code className={`${className} bg-white/10 px-1.5 py-0.5 rounded text-sm`} {...props}>{children}</code>
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

                      {/* AI Toolbar */}
                      {msg.role === 'model' && msg.parts[0]?.text && (
                        <div className="absolute -bottom-10 left-0 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                          <button
                            onClick={() => handleSpeak(msg.id, msg.parts[0].text!)}
                            className={`p-2 rounded-full glass-dark hover:bg-white/10 ${playingMessageId === msg.id ? 'text-cyan-400 animate-pulse' : 'text-gray-400'}`}
                          >
                            {playingMessageId === msg.id ? <StopCircle size={16} /> : <Volume2 size={16} />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(msg.parts[0].text!)}
                            className="p-2 rounded-full glass-dark hover:bg-white/10 text-gray-400 hover:text-white"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start max-w-[75%] gap-4"
              >
                <div className="w-10 h-10 rounded-xl glass-dark flex items-center justify-center shadow-lg text-cyan-300 animate-pulse">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="glass-dark p-6 rounded-3xl rounded-tl-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Command Deck */}
        <div className="p-4 md:p-6 pb-8">
          <div className="max-w-4xl mx-auto relative group/deck">

            {/* Image Preview */}
            <AnimatePresence>
              {previewUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-4 p-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex items-center space-x-3"
                >
                  <img src={previewUrl} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="pr-2">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Analysis Target</p>
                    <button onClick={removeFile} className="text-red-400 text-[10px] hover:underline">Remove</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className={`
                glass-dark rounded-[2rem] p-2 flex items-end border transition-all duration-300
                ${isListening ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20 focus-within:border-indigo-500/50 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.15)]'}
              `}
            >
              <div className="flex flex-col gap-2 p-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <ImageIcon size={20} />
                </button>
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                >
                  {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={isListening ? "Listening..." : "Enter command or query..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-base py-4 px-2 text-white placeholder-gray-500 resize-none max-h-48 min-h-[56px] leading-relaxed scrollbar-hide"
                rows={1}
              />

              <div className="p-1 pb-2 pr-1">
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedFile)}
                  className={`
                    p-3 rounded-[1.5rem] transition-all duration-300 flex items-center justify-center
                    ${isLoading || (!input.trim() && !selectedFile)
                      ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95'}
                  `}
                >
                  {isLoading ? (
                    <Cpu className="animate-spin w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              </div>

              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </motion.div>

            <div className="text-center mt-3 flex items-center justify-center gap-2 opacity-40">
              <Terminal size={10} className="text-blue-400" />
              <p className="text-[10px] font-mono text-blue-200">EIVA SYSTEM V2.0 • SECURE CONNECTION</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default AIChat;
