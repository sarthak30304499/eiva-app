
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

interface AskQuestionProps {
  user: User;
  onAsk: (title: string, content: string, file: File | null) => void;
  isLoading: boolean;
}

const AskQuestion: React.FC<AskQuestionProps> = ({ user, onAsk, isLoading }) => {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
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
          setTitle(prev => (prev + ' ' + transcript).trim());
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        setIsListening(true);
        recognitionRef.current.start();
      } else {
        alert("Voice input is not supported in this browser.");
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (title.trim() && !isLoading) {
      onAsk(title.trim(), '', selectedFile);
      setTitle('');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (isListening) recognitionRef.current?.stop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be under 5MB.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 mb-6 shadow-sm transition-all duration-300 ${title.length > 0 || previewUrl ? 'border-[#6C63FF] ring-2 ring-[#6C63FF]/10' : 'border-gray-100 dark:border-gray-700'}`}>
      <div className="flex items-start space-x-3">
        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border dark:border-gray-700 shrink-0 object-cover" />
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What is your question?"
            disabled={isLoading}
            className="w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-lg font-medium resize-none py-1.5 pr-32 transition-all min-h-[44px] overflow-hidden"
          />

          {previewUrl && (
            <div className="mt-3 relative inline-block animate-fade-in">
              <img src={previewUrl} className="max-h-32 rounded-xl border-2 border-[#6C63FF]/20 shadow-sm" alt="Preview" />
              <button 
                onClick={removeFile}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className="absolute right-0 bottom-1 flex items-center space-x-1 pr-1">
            <button 
              onClick={toggleListening}
              className={`p-2 rounded-full transition-all ${isListening ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse' : 'text-gray-400 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10'}`}
              title={isListening ? 'Stop listening' : 'Speak your question'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z" />
              </svg>
            </button>

            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileChange}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 rounded-full transition-all"
              title="Upload image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {isLoading ? (
              <div className="p-2">
                <svg className="animate-spin h-5 w-5 text-[#6C63FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={!title.trim()}
                className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all duration-200 ${
                  title.trim() 
                    ? 'bg-[#6C63FF] text-white hover:shadow-lg active:scale-95' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                Ask
              </button>
            )}
          </div>
        </div>
      </div>
      
      {(title.length > 0 || previewUrl) && !isLoading && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700 animate-fade-in transition-colors">
          <div className="flex space-x-4">
            <button className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest hover:text-[#6C63FF] transition-colors">
              {selectedFile ? `📎 ${selectedFile.name}` : 'Visual Context Optional'}
            </button>
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {isListening ? 'Listening...' : 'Press Enter to Post'}
          </span>
        </div>
      )}
    </div>
  );
};

export default AskQuestion;
