import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Send,
    ShieldCheck,
    Loader2,
    Bug,
    FileText,
    ArrowUpRight,
    ArrowDownLeft,
    Lock,
    Sparkles,
    Scale,
    PenTool,
    BookOpenCheck,
    Copy,
    Check,
    FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    maskDocument,
    chatDocument,
    exportAdvisoryDocx,
    RepresentableParty,
    AdvisoryMode,
} from '../../app/lib/documentApi';
import { PIIEntity } from '../../app/store/documentStore';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
    entities: PIIEntity[];
    fileName?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    maskedContent?: string;
    effectiveMode?: AdvisoryMode;
    isError?: boolean;
}

const MODE_BADGE_META: Record<
    Exclude<AdvisoryMode, 'qa'>,
    { label: string; className: string; exportTitle: string }
> = {
    review: {
        label: '✨ Dictamen Integral y Mejoras',
        className: 'bg-violet-50 text-violet-700 border-violet-200',
        exportTitle: 'Dictamen Jurídico y Propuesta de Mejoras',
    },
    draft: {
        label: '✍️ Redacción Complementaria',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        exportTitle: 'Propuesta de Cláusulas y Redacción Complementaria',
    },
    compliance: {
        label: '🏛️ Auditoría contra Leyes Públicas',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        exportTitle: 'Auditoría de Cumplimiento Normativo',
    },
};

export default function ChatModal({
    isOpen,
    onClose,
    text,
    entities,
    fileName,
}: ChatModalProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [maskedText, setMaskedText] = useState<string>('');
    const [parties, setParties] = useState<RepresentableParty[]>([]);
    const [selectedPartyToken, setSelectedPartyToken] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMasking, setIsMasking] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [debugTab, setDebugTab] = useState<'traffic' | 'doc'>('traffic');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = async () => {
            setIsMasking(true);
            try {
                const res = await maskDocument(text, entities);
                setSessionId(res.session_id);
                setMaskedText(res.masked_text);
                setParties(res.parties || []);
                setMessages([
                    {
                        id: 'welcome',
                        role: 'assistant',
                        content:
                            '¡Hola! He anonimizado tu documento de forma segura. Puedes hacer preguntas puntuales, elegir a qué parte representas arriba y usar los botones del Copiloto (o escribir libremente) para obtener un dictamen de mejoras, redactar cláusulas faltantes o auditar contra las leyes indexadas.',
                    },
                ]);
            } catch (error) {
                console.error(error);
                const msg =
                    error instanceof Error ? error.message : 'Hubo un error al enmascarar el documento.';
                setMessages([{ id: 'error', role: 'assistant', content: msg, isError: true }]);
            } finally {
                setIsMasking(false);
            }
        };

        if (isOpen && !sessionId) {
            initChat();
        }
        if (!isOpen) {
            setSessionId(null);
            setMaskedText('');
            setParties([]);
            setSelectedPartyToken('');
            setMessages([]);
            setInput('');
            setShowDebug(false);
            setDebugTab('traffic');
            setCopiedId(null);
            setExportingId(null);
        }
    }, [isOpen, sessionId, text, entities]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showDebug]);

    const sendPrompt = async (promptText: string, explicitMode?: AdvisoryMode) => {
        const trimmed = promptText.trim();
        if (!trimmed || !sessionId || isLoading) return;

        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: trimmed }]);
        setIsLoading(true);

        try {
            const res = await chatDocument(sessionId, trimmed, {
                advisoryMode: explicitMode,
                clientPartyToken: selectedPartyToken || null,
            });
            setMessages(prev => [
                ...prev.map(m =>
                    m.id === userMsgId && typeof res.masked_user_message === 'string'
                        ? { ...m, maskedContent: res.masked_user_message }
                        : m
                ),
                {
                    id: `${Date.now()}-reply`,
                    role: 'assistant',
                    content: res.reply,
                    maskedContent:
                        typeof res.raw_masked_reply === 'string' ? res.raw_masked_reply : undefined,
                    effectiveMode: res.effective_mode || explicitMode || 'qa',
                },
            ]);
            setDebugTab('traffic');
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : 'Hubo un error de conexión con la IA.';
            setMessages(prev => [
                ...prev,
                { id: `${Date.now()}-err`, role: 'assistant', content: msg, isError: true },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const currentInput = input;
        setInput('');
        await sendPrompt(currentInput);
    };

    const handleQuickAction = async (mode: Exclude<AdvisoryMode, 'qa'>) => {
        if (!sessionId || isLoading || isMasking) return;

        const selectedParty = parties.find(p => p.token === selectedPartyToken);
        const partyShortName = selectedParty
            ? selectedParty.display_label.split(' (')[0]
            : null;

        let prompt = '';
        if (mode === 'review') {
            prompt = partyShortName
                ? `Revisa integralmente el documento completo y dame un dictamen de riesgos, omisiones y sugerencias de mejora protegiendo a ${partyShortName}.`
                : 'Revisa integralmente el documento completo y dame un dictamen de riesgos, puntos débiles, cláusulas ausentes y sugerencias de mejora.';
        } else if (mode === 'draft') {
            prompt = partyShortName
                ? `Identifica las cláusulas o protecciones que faltan en favor de ${partyShortName} y redáctalas listas para incorporarlas respetando el estilo y numeración del documento.`
                : 'Identifica qué cláusulas importantes le faltan a este documento y redáctalas listas para incorporarlas respetando su estilo y numeración.';
        } else {
            prompt =
                'Audita todo el documento frente a las leyes y criterios de la Biblioteca Pública, señalando cumplimientos, omisiones legales y ajustes recomendados.';
        }

        await sendPrompt(prompt, mode);
    };

    const handleCopyMessage = async (msg: Message) => {
        try {
            await navigator.clipboard.writeText(msg.content);
            setCopiedId(msg.id);
            toast.success('Texto copiado al portapapeles');
            setTimeout(() => {
                setCopiedId(prev => (prev === msg.id ? null : prev));
            }, 2000);
        } catch (err) {
            console.error(err);
            toast.error('No se pudo copiar el texto');
        }
    };

    const handleExportDocx = async (msg: Message) => {
        setExportingId(msg.id);
        try {
            const modeKey =
                msg.effectiveMode && msg.effectiveMode !== 'qa' ? msg.effectiveMode : null;
            const title = modeKey
                ? MODE_BADGE_META[modeKey].exportTitle
                : 'Consulta y Opinión Jurídica';
            const selectedParty = parties.find(p => p.token === selectedPartyToken);
            const partyLabel = selectedParty
                ? selectedParty.display_label
                : 'Neutral / Equilibrada';

            const blob = await exportAdvisoryDocx({
                title,
                content: msg.content,
                sourceFilename: fileName,
                partyLabel,
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseStem = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'documento';
            a.download = `dictamen_${baseStem}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Archivo Word (.docx) descargado localmente');
        } catch (err) {
            console.error(err);
            const eMsg = err instanceof Error ? err.message : 'Error al exportar a Word';
            toast.error(eMsg);
        } finally {
            setExportingId(null);
        }
    };

    if (!isOpen) return null;

    const auditedMessages = messages.filter(
        m => typeof m.maskedContent === 'string' && m.maskedContent.length > 0
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                className={`bg-white w-full ${showDebug ? 'max-w-6xl' : 'max-w-3xl'} h-[86vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95`}
            >
                {/* Header */}
                <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <span>Chat y Copiloto Jurídico Zero-Knowledge</span>
                            </h3>
                            <p className="text-xs text-gray-500">
                                Revisión integral, cláusulas complementarias y consultas sin exponer PII real
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showDebug ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <Bug size={14} />
                            <span>Debug {auditedMessages.length > 0 ? `(${auditedMessages.length})` : ''}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Barra del Copiloto: Postura de Parte Representada + Acciones Integrales */}
                {!isMasking && sessionId && (
                    <div className="px-6 py-2.5 border-b bg-violet-50/70 border-violet-100 shrink-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 shrink-0">
                                    <Scale size={14} className="text-indigo-600" />
                                    Represento a:
                                </span>
                                <select
                                    value={selectedPartyToken}
                                    onChange={e => setSelectedPartyToken(e.target.value)}
                                    disabled={isLoading}
                                    className="text-xs rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-w-full truncate"
                                >
                                    <option value="">⚖️ Postura Neutral / Equilibrada</option>
                                    {parties.map(p => (
                                        <option key={p.token} value={p.token}>
                                            {p.display_label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedPartyToken && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                                    <Lock size={10} />
                                    IA solo ve {selectedPartyToken}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickAction('review')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-violet-50 text-violet-800 border border-violet-200/90 shadow-2xs transition-colors disabled:opacity-50"
                            >
                                <Sparkles size={13} className="text-violet-600" />
                                <span>Sugerir mejoras y riesgos</span>
                            </button>
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickAction('draft')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200/90 shadow-2xs transition-colors disabled:opacity-50"
                            >
                                <PenTool size={13} className="text-indigo-600" />
                                <span>Redactar cláusulas faltantes</span>
                            </button>
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickAction('compliance')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs transition-colors disabled:opacity-50"
                            >
                                <BookOpenCheck size={13} className="text-emerald-600" />
                                <span>Auditar contra Leyes Públicas</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-hidden flex relative">
                    {/* Panel de Auditoría / Debug (Opcional) */}
                    {showDebug && (
                        <div className="w-[42%] min-w-[300px] min-h-0 border-r border-gray-200 bg-gray-50 flex flex-col animate-in slide-in-from-left duration-200">
                            <div className="p-2 bg-amber-50/90 border-b border-amber-100 flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setDebugTab('traffic')}
                                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${debugTab === 'traffic' ? 'bg-white text-amber-900 shadow-xs border border-amber-200/70' : 'text-amber-700/80 hover:bg-amber-100/60'}`}
                                >
                                    <Bug size={13} />
                                    <span>Tráfico IA ({auditedMessages.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDebugTab('doc')}
                                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${debugTab === 'doc' ? 'bg-white text-amber-900 shadow-xs border border-amber-200/70' : 'text-amber-700/80 hover:bg-amber-100/60'}`}
                                >
                                    <FileText size={13} />
                                    <span>Doc. Enmascarado</span>
                                </button>
                            </div>

                            {debugTab === 'traffic' ? (
                                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                                    {auditedMessages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500 space-y-2">
                                            <ShieldCheck size={24} className="text-amber-600/70" />
                                            <p className="text-xs leading-relaxed">
                                                Envía una pregunta o solicita un dictamen para auditar aquí cómo viaja la solicitud enmascarada hacia la IA y qué tokens responde.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setDebugTab('doc')}
                                                className="text-xs font-medium text-indigo-600 hover:underline pt-1"
                                            >
                                                Ver documento completo enmascarado
                                            </button>
                                        </div>
                                    ) : (
                                        auditedMessages.map(msg => (
                                            <div
                                                key={`dbg-${msg.id}`}
                                                className={`rounded-xl p-3 border text-xs font-mono whitespace-pre-wrap break-words ${
                                                    msg.role === 'user'
                                                        ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950'
                                                        : 'bg-white border-gray-200 text-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider mb-1.5 text-gray-500">
                                                    {msg.role === 'user' ? (
                                                        <>
                                                            <ArrowUpRight size={12} className="text-indigo-600" />
                                                            <span className="text-indigo-700">Pregunta enviada a la IA</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowDownLeft size={12} className="text-emerald-600" />
                                                            <span className="text-emerald-700">Respuesta cruda de la IA</span>
                                                        </>
                                                    )}
                                                </div>
                                                {msg.maskedContent}
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 min-h-0 overflow-y-auto p-4 text-xs font-mono text-gray-600 whitespace-pre-wrap">
                                    {maskedText || 'Esperando documento...'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-gray-50/30 flex flex-col">
                        {isMasking ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                                <Loader2 className="animate-spin text-indigo-500" size={32} />
                                <p className="text-sm font-medium">
                                    Anonimizando documento, identificando partes y generando diccionario de alias...
                                </p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const badgeMeta =
                                    msg.role === 'assistant' &&
                                    msg.effectiveMode &&
                                    msg.effectiveMode !== 'qa'
                                        ? MODE_BADGE_META[msg.effectiveMode]
                                        : null;
                                const showExportActions =
                                    msg.role === 'assistant' &&
                                    msg.id !== 'welcome' &&
                                    msg.id !== 'error' &&
                                    !msg.isError;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        {badgeMeta && (
                                            <span
                                                className={`mb-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeMeta.className}`}
                                            >
                                                {badgeMeta.label}
                                            </span>
                                        )}

                                        <div
                                            className={`max-w-[88%] p-4 rounded-2xl ${
                                                msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200'
                                                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-none'
                                            }`}
                                        >
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {msg.content}
                                            </p>
                                        </div>

                                        {/* Acciones locales de Copiado y Exportación Word (.docx) */}
                                        {showExportActions && (
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyMessage(msg)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200/80 transition-colors"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <>
                                                            <Check size={12} className="text-emerald-600" />
                                                            <span className="text-emerald-700">Copiado</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} />
                                                            <span>Copiar</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={exportingId === msg.id}
                                                    onClick={() => handleExportDocx(msg)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 transition-colors disabled:opacity-50"
                                                >
                                                    {exportingId === msg.id ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <FileDown size={12} />
                                                    )}
                                                    <span>Descargar .docx</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Tira de auditoría directa bajo cada burbuja cuando Debug está activo */}
                                        {showDebug && msg.maskedContent && (
                                            <div
                                                className={`mt-1.5 max-w-[88%] px-3 py-1.5 rounded-lg border text-[11px] font-mono whitespace-pre-wrap break-words ${
                                                    msg.role === 'user'
                                                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                                                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                                }`}
                                            >
                                                <span className="inline-flex items-center gap-1 font-sans font-semibold uppercase tracking-wide text-[10px] mr-1.5 opacity-80">
                                                    <Lock size={10} />
                                                    {msg.role === 'user' ? 'Enviado a IA:' : 'Crudo IA:'}
                                                </span>
                                                {msg.maskedContent}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white text-gray-500 border border-gray-100 shadow-sm rounded-2xl rounded-tl-none p-4 flex items-center space-x-2">
                                    <div
                                        className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                                        style={{ animationDelay: '0ms' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                                        style={{ animationDelay: '150ms' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                                        style={{ animationDelay: '300ms' }}
                                    />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Pregunta sobre el documento o pide sugerencias / redacción de cláusulas..."
                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400 text-sm"
                            disabled={isLoading || isMasking || !sessionId}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading || isMasking || !sessionId}
                            className="absolute right-2 top-1.5 p-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 rounded-lg transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
