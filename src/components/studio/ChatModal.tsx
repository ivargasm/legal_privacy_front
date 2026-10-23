import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldCheck, Loader2, Bug } from 'lucide-react';
import { maskDocument, chatDocument } from '../../app/lib/documentApi';
import { PIIEntity } from '../../app/store/documentStore';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
    entities: PIIEntity[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatModal({ isOpen, onClose, text, entities }: ChatModalProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [maskedText, setMaskedText] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMasking, setIsMasking] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = async () => {
            setIsMasking(true);
            try {
                const res = await maskDocument(text, entities);
                setSessionId(res.session_id);
                setMaskedText(res.masked_text);
                setMessages([
                    {
                        id: 'welcome',
                        role: 'assistant',
                        content: '¡Hola! He anonimizado tu documento de forma segura. Ahora puedes hacerme preguntas sobre él y yo te responderé mostrándote los nombres reales, aunque la IA externa nunca los verá. ¿En qué te ayudo?'
                    }
                ]);
            } catch (error) {
                console.error(error);
                setMessages([{ id: 'error', role: 'assistant', content: 'Hubo un error al enmascarar el documento.' }]);
            } finally {
                setIsMasking(false);
            }
        };

        if (isOpen && !sessionId) {
            initChat();
        }
        if (!isOpen) {
            // Reset state when closed
            setSessionId(null);
            setMaskedText('');
            setMessages([]);
            setInput('');
            setShowDebug(false);
        }
    }, [isOpen, sessionId, text, entities]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !sessionId || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await chatDocument(sessionId, userMsg);
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: res.reply }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Hubo un error de conexión con la IA.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Chat Seguro Zero-Knowledge</h3>
                            <p className="text-xs text-gray-500">Tus datos reales no salen de este servidor</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showDebug ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <Bug size={14} />
                            <span>Debug</span>
                        </button>
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex relative">
                    {/* Panel de Debug (Opcional) */}
                    {showDebug && (
                        <div className="w-1/3 min-w-[250px] border-r border-gray-100 bg-gray-50 flex flex-col animate-in slide-in-from-left duration-200">
                            <div className="p-3 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider flex items-center">
                                <Bug size={14} className="mr-2" /> Texto Encriptado (IA)
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono text-gray-600 whitespace-pre-wrap">
                                {maskedText || "Esperando documento..."}
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 flex flex-col">
                    {isMasking ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                            <p className="text-sm font-medium">Anonimizando documento y preparando diccionario temporal...</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200'
                                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-none'
                                    }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white text-gray-500 border border-gray-100 shadow-sm rounded-2xl rounded-tl-none p-4 flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Pregunta sobre el contrato..."
                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400"
                            disabled={isLoading || isMasking || !sessionId}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading || isMasking || !sessionId}
                            className="absolute right-2 top-2 p-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 rounded-lg transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
