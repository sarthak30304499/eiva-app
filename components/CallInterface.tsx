import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { generateAIAnswer } from '../services/geminiService';

interface CallInterfaceProps {
    user: User | null;
    onEndCall: () => void;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ user, onEndCall }) => {
    const [status, setStatus] = useState<'listening' | 'thinking' | 'speaking' | 'idle'>('idle');
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');

    // Refs for speech recognition and synthesis
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
    const silenceTimer = useRef<any>(null);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false; // We want to stop after a sentence
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                setStatus('listening');
                setTranscript('');
                setErrorMessage(null);
                // Clear any silence timer
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
            };

            recognitionRef.current.onresult = (event: any) => {
                const current = event.resultIndex;
                const transcriptText = event.results[current][0].transcript;
                setTranscript(transcriptText);

                // Reset silence timer on every result
                if (silenceTimer.current) clearTimeout(silenceTimer.current);

                // If user stops speaking for 1.5 seconds, assume they are done
                silenceTimer.current = setTimeout(() => {
                    if (event.results[current].isFinal || transcriptText.length > 0) {
                        recognitionRef.current.stop();
                    }
                }, 1500);
            };

            recognitionRef.current.onend = () => {
                // If we have a transcript, process it
                if (transcript.trim().length > 0) {
                    handleUserQuery(transcript);
                } else {
                    setStatus('idle');
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setErrorMessage("Microphone access denied. Please allow permission.");
                    alert("Please allow microphone access in your browser settings to use this feature.");
                } else if (event.error === 'no-speech') {
                    // Ignore, just returns to idle
                } else {
                    setErrorMessage("Error: " + event.error);
                }
                setStatus('idle');
            };

        } else {
            setErrorMessage("Browser not supported.");
            alert("Your browser does not support Speech Recognition. Please use Chrome.");
        }

        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
            if (synthRef.current) synthRef.current.cancel();
        };
    }, [transcript]); // Dependency on transcript to ensure we capture latest state

    // Start listening loop
    const startListening = () => {
        setErrorMessage(null);
        if (recognitionRef.current && status === 'idle') {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
                setErrorMessage("Could not start microphone.");
            }
        } else if (!recognitionRef.current) {
            alert("Speech Recognition not initialized. Are you using Chrome?");
        }
    };

    const handleUserQuery = async (text: string) => {
        setStatus('thinking');

        // 1. Get answer from Gemini
        const response = await generateAIAnswer(text);
        const aiText = response.text;
        setAiResponse(aiText);

        // 2. Speak the answer
        speak(aiText);
    };

    const speak = (text: string) => {
        if (!synthRef.current) return;

        // Cancel any existing speech
        synthRef.current.cancel();

        setStatus('speaking');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to pick a nice voice
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
            setStatus('idle');
            setTranscript('');
        };

        synthRef.current.speak(utterance);
    };

    const handleMicClick = () => {
        if (status === 'speaking') {
            synthRef.current.cancel();
            setStatus('idle');
        } else if (status === 'listening') {
            recognitionRef.current.stop();
        } else {
            startListening();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-between py-12 px-4 backdrop-blur-sm transition-all duration-500">
            {/* Header */}
            <div className="text-center animate-fade-in-down">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <span className="text-4xl">🤖</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-widest">{status === 'listening' ? 'LISTENING...' : status === 'thinking' ? 'THINKING...' : status === 'speaking' ? 'EIVA SPEAKING' : 'EIVA'}</h2>
                <p className="text-purple-300 text-sm mt-1">{status === 'idle' ? 'Tap the mic to talk' : 'In call...'}</p>
            </div>

            {/* Visualizer / Central Interaction Area */}
            <div className="flex-1 flex items-center justify-center w-full">
                {/* Visualizer Circles */}
                <div className="relative">
                    {/* Outer Glow */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20 transition-all duration-500 ${status === 'listening' || status === 'speaking' ? 'scale-150 opacity-40' : 'scale-100'}`}></div>

                    {/* Main Pulse Circle */}
                    <button
                        onClick={handleMicClick}
                        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${status === 'listening' ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] scale-110' :
                            status === 'thinking' ? 'bg-yellow-400 animate-pulse' :
                                status === 'speaking' ? 'bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-bounce-slow' :
                                    'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                            }`}
                    >
                        {status === 'listening' ? (
                            <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        ) : status === 'speaking' ? (
                            <div className="flex space-x-1 items-center h-8">
                                <div className="w-1 bg-white h-4 animate-sound-wave-1"></div>
                                <div className="w-1 bg-white h-8 animate-sound-wave-2"></div>
                                <div className="w-1 bg-white h-6 animate-sound-wave-3"></div>
                                <div className="w-1 bg-white h-8 animate-sound-wave-2"></div>
                                <div className="w-1 bg-white h-4 animate-sound-wave-1"></div>
                            </div>
                        ) : status === 'thinking' ? (
                            <svg className="w-12 h-12 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        ) : (
                            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Transcript Area */}
            <div className="w-full max-w-md bg-gray-800 bg-opacity-50 rounded-2xl p-4 min-h-[120px] mb-8 backdrop-blur-md border border-gray-700">
                {status === 'listening' ? (
                    <p className="text-gray-300 italic">{transcript || "Listening..."}</p>
                ) : status === 'speaking' || status === 'thinking' ? (
                    <div className="space-y-2">
                        <p className="text-gray-400 text-xs uppercase font-bold text-right">You</p>
                        <p className="text-white text-right mb-4">{transcript}</p>
                        <div className="h-px bg-gray-700 my-2"></div>
                        <p className="text-purple-400 text-xs uppercase font-bold">Eiva</p>
                        <p className="text-purple-100">{aiResponse || "Thinking..."}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <p className="text-gray-500 text-center">Tap the mic to start speaking.</p>
                        {errorMessage && (
                            <p className="text-red-400 text-xs mt-2 font-bold bg-red-900/20 px-2 py-1 rounded border border-red-500/30">
                                ⚠️ {errorMessage}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-6 mb-8">
                <button
                    onClick={onEndCall}
                    className="p-4 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-105 active:scale-95"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
                </button>
            </div>
        </div>
    );
};

export default CallInterface;
