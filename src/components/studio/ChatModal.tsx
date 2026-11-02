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
    Bot,
    ChevronDown,
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
        className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
        exportTitle: 'Dictamen Jurídico y Propuesta de Mejoras',
    },
    draft: {
        label: '✍️ Redacción Complementaria',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
        exportTitle: 'Propuesta de Cláusulas y Redacción Complementaria',
    },
    compliance: {
        label: '🏛️ Auditoría contra Leyes Públicas',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
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
                            '¡Hola! He anonimizado tu documento de forma segura. Selecciona a qué parte representas en la parte superior y usa los botones de acción para pedir un dictamen de riesgos, redactar cláusulas complementarias o auditar contra las leyes públicas indexadas.',
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
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
            {/* Backdrop sutil semitransparente */}
            <div
                className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-2xs transition-opacity pointer-events-auto"
                onClick={onClose}
            />

            {/* Slide-Over Drawer Lateral (480px) */}
            <aside
                aria-label="Copiloto Jurídico"
                className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-slate-800 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-200"
            >
                {/* Header del Copiloto */}
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                                    Copiloto Jurídico
                                </h3>
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Local
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                                Zero-Trust · Datos reales nunca salen de tu equipo
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                showDebug
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Bug size={13} />
                            <span>Debug {auditedMessages.length > 0 ? `(${auditedMessages.length})` : ''}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Barra de Postura de Representación + Acciones Rápidas */}
                {!isMasking && sessionId && (
                    <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-violet-50/40 dark:bg-violet-950/20 shrink-0 space-y-2">
                        {/* Selector de Postura */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0 uppercase tracking-wider flex items-center gap-1">
                                    <Scale className="w-3 h-3 text-indigo-600" />
                                    Posición:
                                </span>
                                <div className="relative flex-1 min-w-0">
                                    <select
                                        value={selectedPartyToken}
                                        onChange={e => setSelectedPartyToken(e.target.value)}
                                        disabled={isLoading}
                                        className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 pl-2 pr-6 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate appearance-none"
                                    >
                                        <option value="">⚖️ Neutral / Equilibrada</option>
                                        {parties.map(p => (
                                            <option key={p.token} value={p.token}>
                                                {p.display_label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                                </div>
                            </div>
                            {selectedPartyToken && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                                    <Lock size={9} />
                                    {selectedPartyToken}
                                </span>
                            )}
                        </div>

                        {/* Chips de Acción Inmediata */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickAction('review')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-violet-50 text-violet-800 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/60 shadow-2xs shrink-0 transition-colors disabled:opacity-50"
                            >
                                <Sparkles size={11} className="text-violet-600" />
                                <span>Sugerir Mejoras</span>
                            </button>
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickAction('draft')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-indigo-50 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs shrink-0 transition-colors disabled:opacity-50"
                            >
                                <PenTool size={11} className="text-indigo-600" />
                                <span>Redactar Cláusulas</span>
                            </button>
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickAction('compliance')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs shrink-0 transition-colors disabled:opacity-50"
                            >
                                <BookOpenCheck size={11} className="text-emerald-600" />
                                <span>Auditar Leyes</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Área de Conversación / Debug */}
                <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-slate-50/30 dark:bg-slate-900/40">
                    {/* Debug Panel Inspector si está abierto */}
                    {showDebug && (
                        <div className="border-b border-amber-200 bg-amber-50/90 dark:bg-amber-950/30 p-2.5 text-xs font-mono max-h-48 overflow-y-auto space-y-2 shrink-0">
                            <div className="flex items-center justify-between text-[10px] font-sans font-bold uppercase text-amber-900 dark:text-amber-300">
                                <span>Auditoría de Tráfico Seguro</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDebugTab('traffic')}
                                        className={`hover:underline ${debugTab === 'traffic' ? 'font-bold underline' : ''}`}
                                    >
                                        Tráfico ({auditedMessages.length})
                                    </button>
                                    <span>|</span>
                                    <button
                                        type="button"
                                        onClick={() => setDebugTab('doc')}
                                        className={`hover:underline ${debugTab === 'doc' ? 'font-bold underline' : ''}`}
                                    >
                                        Doc Enmascarado
                                    </button>
                                </div>
                            </div>

                            {debugTab === 'traffic' ? (
                                auditedMessages.length === 0 ? (
                                    <p className="text-[11px] text-amber-700">Envía un mensaje para auditar los tokens anónimos en tránsito.</p>
                                ) : (
                                    auditedMessages.map(msg => (
                                        <div key={`dbg-${msg.id}`} className="bg-white/80 dark:bg-slate-900/80 p-2 rounded border border-amber-200 text-[10px] break-words">
                                            <span className="font-sans font-semibold text-amber-800 block">
                                                {msg.role === 'user' ? 'Enviado a IA:' : 'Respuesta Cruda:'}
                                            </span>
                                            {msg.maskedContent}
                                        </div>
                                    ))
                                )
                            ) : (
                                <div className="text-[10px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                    {maskedText || 'Esperando...'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stream de Mensajes */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 flex flex-col">
                        {isMasking ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 text-center p-4">
                                <Loader2 className="animate-spin text-indigo-500" size={28} />
                                <p className="text-xs font-medium">Anonimizando documento y preparando el entorno seguro...</p>
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
                                                className={`mb-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeMeta.className}`}
                                            >
                                                {badgeMeta.label}
                                            </span>
                                        )}

                                        <div
                                            className={`max-w-[92%] p-3.5 rounded-xl text-xs leading-relaxed ${
                                                msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs rounded-tl-none'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>

                                        {/* Botones de Acción (Copiar / Descargar .docx) */}
                                        {showExportActions && (
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyMessage(msg)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700 transition-colors"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <>
                                                            <Check size={11} className="text-emerald-600" />
                                                            <span className="text-emerald-700">Copiado</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={11} />
                                                            <span>Copiar</span>
                                                        </>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={exportingId === msg.id}
                                                    onClick={() => handleExportDocx(msg)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200/80 dark:border-indigo-800 transition-colors disabled:opacity-50"
                                                >
                                                    {exportingId === msg.id ? (
                                                        <Loader2 size={11} className="animate-spin" />
                                                    ) : (
                                                        <FileDown size={11} />
                                                    )}
                                                    <span>Descargar .docx</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 text-slate-400 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Flotante Inferior + Aviso Cero Telemetría */}
                <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Propón una cláusula o pregunta sobre el contrato..."
                            className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
                            disabled={isLoading || isMasking || !sessionId}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading || isMasking || !sessionId}
                            className="absolute right-1.5 p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 rounded-lg transition-colors"
                        >
                            <Send size={14} />
                        </button>
                    </form>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
                        <span className="flex items-center gap-1 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Llama 3 / Qwen Local (8B-Q4)
                        </span>
                        <span className="flex items-center gap-1">
                            <Lock size={10} className="text-slate-400" />
                            Cero telemetría externa
                        </span>
                    </div>
                </div>
            </aside>
        </div>
    );
}
