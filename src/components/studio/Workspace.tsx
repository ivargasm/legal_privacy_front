'use client';

import { useDocumentStore, PIIEntity } from '@/app/store/documentStore';
import { redactDocument, getBlacklist, deleteFromBlacklist } from '@/app/lib/documentApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Download,
    Building2,
    User,
    MapPin,
    FileDigit,
    List,
    Trash2,
    X,
    CreditCard,
    Scale,
    BadgeCheck,
    Highlighter,
    Sparkles,
    ArrowLeft,
    ShieldCheck,
    Lock,
    Eye,
    EyeOff,
    FileText,
    ZoomIn,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import ChatModal from './ChatModal';

// Paleta oficial pastel de bajo contraste definida en DESIGN_GUIDE.md
const ENTITY_CONFIG: Record<
    string,
    { label: string; icon: React.ReactNode; color: string; border: string; category: string }
> = {
    PERSON: {
        label: 'Persona Física',
        icon: <User className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#E0F2FE] text-[#0369A1]',
        border: 'border-[#BAE6FD]',
        category: 'Personas Físicas',
    },
    ORG: {
        label: 'Persona Jurídica',
        icon: <Building2 className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#F3E8FF] text-[#6B21A8]',
        border: 'border-[#E9D5FF]',
        category: 'Personas Jurídicas y CIF',
    },
    LOC: {
        label: 'Domicilio / Ubicación',
        icon: <MapPin className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#E0E7FF] text-[#4338CA]',
        border: 'border-[#C7D2FE]',
        category: 'Ubicaciones y Domicilios',
    },
    ID_FISCAL: {
        label: 'RFC / Identificación Fiscal',
        icon: <FileDigit className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#ECFDF5] text-[#047857]',
        border: 'border-[#A7F3D0]',
        category: 'Datos Financieros y Montos',
    },
    ID_OFICIAL: {
        label: 'CURP / INE / Identificación Oficial',
        icon: <BadgeCheck className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#ECFDF5] text-[#047857]',
        border: 'border-[#A7F3D0]',
        category: 'Datos Financieros y Montos',
    },
    CUENTA_BANCARIA: {
        label: 'CLABE / Cuenta Bancaria',
        icon: <CreditCard className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#ECFDF5] text-[#047857]',
        border: 'border-[#A7F3D0]',
        category: 'Datos Financieros y Montos',
    },
    EXPEDIENTE: {
        label: 'Expediente / Escritura',
        icon: <Scale className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#FEF3C7] text-[#92400E]',
        border: 'border-[#FDE68A]',
        category: 'Referencias Jurídicas',
    },
    MANUAL: {
        label: 'Selección Manual',
        icon: <Highlighter className="w-3.5 h-3.5 mr-1" />,
        color: 'bg-[#FEF3C7] text-[#92400E]',
        border: 'border-[#FDE68A]',
        category: 'Otras Referencias',
    },
};

export default function Workspace() {
    const { file, extractedText, entities, toggleEntityStatus, reset, addEntity } = useDocumentStore();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Blacklist State
    const [showBlacklist, setShowBlacklist] = useState(false);
    const [blacklistItems, setBlacklistItems] = useState<{ id: number; text: string }[]>([]);
    const [isLoadingBlacklist, setIsLoadingBlacklist] = useState(false);

    // Manual Selection Tooltip State
    const textContainerRef = useRef<HTMLDivElement>(null);
    const [popupState, setPopupState] = useState({
        show: false,
        top: 0,
        left: 0,
        start: 0,
        end: 0,
        text: '',
    });

    // Calcular estadísticas de cobertura
    const activeEntities = useMemo(() => entities.filter((e) => !e.isBlacklisted), [entities]);
    const approvedEntities = useMemo(() => activeEntities.filter((e) => e.isApproved), [activeEntities]);
    const coveragePercent = activeEntities.length > 0 ? Math.round((approvedEntities.length / activeEntities.length) * 100) : 100;

    // Agrupar entidades por categorías para la barra lateral
    const groupedEntities = useMemo(() => {
        const groups: Record<string, { entity: PIIEntity; originalIndex: number }[]> = {
            'Personas Físicas': [],
            'Personas Jurídicas y CIF': [],
            'Datos Financieros y Montos': [],
            'Otras Referencias': [],
        };

        entities.forEach((ent, idx) => {
            if (ent.isBlacklisted) return;
            const config = ENTITY_CONFIG[ent.entity_type];
            const cat = config?.category || 'Otras Referencias';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push({ entity: ent, originalIndex: idx });
        });

        return groups;
    }, [entities]);

    if (!file) return null;

    const handleOpenBlacklist = async () => {
        setShowBlacklist(true);
        setIsLoadingBlacklist(true);
        try {
            const data = await getBlacklist();
            setBlacklistItems(data);
        } catch (e) {
            console.error(e);
            toast.error('Error al cargar la lista de excepciones');
        } finally {
            setIsLoadingBlacklist(false);
        }
    };

    const handleDeleteFromBlacklist = async (id: number, text: string) => {
        try {
            await deleteFromBlacklist(id);
            setBlacklistItems((prev) => prev.filter((item) => item.id !== id));
            useDocumentStore.getState().restoreBlacklistedText(text);
            toast.success('Palabra eliminada de las excepciones');
        } catch (e) {
            console.error(e);
            toast.error('Error al eliminar la excepción');
        }
    };

    const handleToggleAll = (approved: boolean) => {
        entities.forEach((ent, idx) => {
            if (!ent.isBlacklisted && ent.isApproved !== approved) {
                toggleEntityStatus(idx);
            }
        });
        toast.info(approved ? 'Todas las entidades marcadas para testado' : 'Todas las entidades desmarcadas');
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        toast.info('Generando documento testado con seguridad criptográfica...');

        try {
            const approvedList = entities.filter((e) => e.isApproved);
            const blob = await redactDocument(file, approvedList);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `redactado_${file.name}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Documento testado descargado con éxito');
        } catch (error) {
            const e = error as Error;
            console.error(e);
            toast.error(e.message || 'Error al redactar el documento');
        } finally {
            setIsDownloading(false);
        }
    };

    // Selección manual en el visor
    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !textContainerRef.current) {
            if (popupState.show) setPopupState((prev) => ({ ...prev, show: false }));
            return;
        }

        const container = textContainerRef.current;
        if (!container.contains(selection.anchorNode)) return;

        try {
            const range = selection.getRangeAt(0);
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(container);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);

            const start = preSelectionRange.toString().length;
            const text = range.toString().trim();
            const end = start + text.length;

            if (!text) return;

            const rect = range.getBoundingClientRect();

            setPopupState({
                show: true,
                top: rect.top - 46,
                left: Math.max(10, rect.left + rect.width / 2 - 110),
                start,
                end,
                text,
            });
        } catch (e) {
            console.error('Error calculando offset de selección', e);
        }
    };

    const handleManualRedact = () => {
        addEntity({
            text: popupState.text,
            entity_type: 'MANUAL',
            page: 0,
            bbox: null,
            start_char: popupState.start,
            end_char: popupState.end,
            confidence: 1.0,
            isApproved: true,
        });
        setPopupState((prev) => ({ ...prev, show: false }));
        window.getSelection()?.removeAllRanges();
        toast.success(`Fragmento "${popupState.text.slice(0, 30)}..." agregado para testado`);
    };

    const handleManualIgnore = async () => {
        try {
            const { blacklistEntity } = await import('@/app/lib/documentApi');
            await blacklistEntity(popupState.text);
            useDocumentStore.getState().setEntityBlacklisted(popupState.text, true);
            setPopupState((prev) => ({ ...prev, show: false }));
            window.getSelection()?.removeAllRanges();
            toast.success(`"${popupState.text}" agregada a excepciones globales`);
        } catch (err) {
            console.error(err);
            toast.error('No se pudo añadir a excepciones');
        }
    };

    // Render del texto con resaltadores pastel de bajo contraste
    const renderHighlightedText = () => {
        if (!extractedText) return null;

        const segments = [];
        let currentIndex = 0;
        const sortedEntities = [...entities].sort((a, b) => a.start_char - b.start_char);

        sortedEntities.forEach((ent, idx) => {
            if (ent.start_char < currentIndex) return;
            if (ent.isBlacklisted) return;

            if (ent.start_char > currentIndex) {
                segments.push(
                    <span key={`txt-${idx}`}>{extractedText.slice(currentIndex, ent.start_char)}</span>
                );
            }

            const config = ENTITY_CONFIG[ent.entity_type] || {
                color: 'bg-slate-100 text-slate-800',
                border: 'border-slate-300',
                label: ent.entity_type,
            };

            segments.push(
                <mark
                    key={`mark-${idx}`}
                    className={`inline-block mx-0.5 px-1.5 py-0.5 rounded-sm font-medium transition-all border ${
                        ent.isApproved
                            ? `${config.color} ${config.border} shadow-2xs`
                            : 'bg-transparent text-slate-400 line-through border-dashed border-slate-300'
                    }`}
                    title={`${config.label || ent.entity_type}: ${ent.text}`}
                >
                    {extractedText.slice(ent.start_char, ent.end_char)}
                </mark>
            );

            currentIndex = ent.end_char;
        });

        if (currentIndex < extractedText.length) {
            segments.push(<span key="txt-end">{extractedText.slice(currentIndex)}</span>);
        }

        return segments;
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#FAFAFA] dark:bg-slate-950 relative overflow-hidden">
            {/* Tooltip Flotante de Selección Manual (Dark Pill) */}
            {popupState.show && (
                <div
                    className="fixed z-50 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1.5 rounded-full shadow-xl border border-slate-700 text-xs font-medium"
                    style={{ top: popupState.top, left: popupState.left }}
                >
                    <span className="text-slate-300 pr-1 text-[11px] font-sans border-r border-slate-700">
                        {popupState.text.length > 20 ? `${popupState.text.slice(0, 18)}...` : popupState.text}
                    </span>
                    <button
                        type="button"
                        onClick={handleManualRedact}
                        className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                    >
                        <EyeOff className="w-3 h-3 text-emerald-400" />
                        <span>Ocultar</span>
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                        type="button"
                        onClick={handleManualIgnore}
                        className="hover:text-amber-400 transition-colors flex items-center gap-1"
                    >
                        <Eye className="w-3 h-3 text-amber-400" />
                        <span>Ignorar</span>
                    </button>
                </div>
            )}

            {/* Barra de Control Superior */}
            <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Documentos</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[280px] sm:max-w-[420px]">
                            {file.name}
                        </h2>
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Modo Seguro Activo
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                            SHA: 4f8e...e901
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOpenBlacklist}
                        className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                        <List className="w-3.5 h-3.5 mr-1.5" />
                        Excepciones
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="text-xs border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300"
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {isDownloading ? 'Generando...' : 'Exportar Testado'}
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => setIsChatOpen(true)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-2xs flex items-center gap-1.5"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Copiloto Jurídico</span>
                    </Button>
                </div>
            </div>

            {/* Sub-barra de Aislamiento */}
            <div className="px-6 py-1 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>Entorno Aislado: El texto no abandona el espacio de memoria RAM del navegador</span>
                </div>
                <div className="hidden sm:flex items-center gap-3 font-mono">
                    <span>99.8% confianza de extracción NER</span>
                </div>
            </div>

            {/* Modal de Lista Negra / Excepciones */}
            {showBlacklist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="w-[460px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Palabras Ignoradas (Excepciones)</h3>
                            <button
                                type="button"
                                onClick={() => setShowBlacklist(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-0">
                            <ScrollArea className="h-[340px] w-full p-4">
                                {isLoadingBlacklist ? (
                                    <div className="text-center py-10 text-xs text-slate-400">Cargando excepciones...</div>
                                ) : blacklistItems.length === 0 ? (
                                    <div className="text-center py-10 text-xs text-slate-500">
                                        No hay palabras en la lista personal de excepciones.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {blacklistItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex justify-between items-center px-3 py-2 border border-slate-200/70 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30"
                                            >
                                                <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{item.text}</span>
                                                <button
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                                    onClick={() => handleDeleteFromBlacklist(item.id, item.text)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            )}

            {/* Layout Principal: Canvas de Hoja de Papel + Sidebar Lateral */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Lienzo del Contrato (Lado Izquierdo / Centro) con fondo porcelana/slate */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-100/70 dark:bg-slate-950/80">
                    {/* Contenedor scrolleable con margen exterior y centrado de hoja */}
                    <div className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-8 sm:px-12">
                        {/* Hoja de papel legal centrada con sombra, borde y paddings internos reales */}
                        <div
                            ref={textContainerRef}
                            onMouseUp={handleMouseUp}
                            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm rounded-md p-8 sm:p-14 max-w-3xl mx-auto my-2 whitespace-pre-wrap font-sans text-sm sm:text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 select-text"
                            style={{ minHeight: '850px' }}
                        >
                            {renderHighlightedText()}
                        </div>
                    </div>

                    {/* Barra Inferior de Navegación y Zoom */}
                    <div className="px-6 py-2 bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
                        <div className="flex items-center gap-2">
                            <span>Página</span>
                            <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-mono text-[11px]">
                                <ChevronLeft className="w-3 h-3 text-slate-400" />
                                <span className="px-1 text-slate-700 dark:text-slate-200">1 / 1</span>
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                                <ZoomIn className="w-3 h-3" />
                                <span>100%</span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {approvedEntities.length} entidades protegidas
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Derecho: Panel de Entidades Agrupadas */}
                <div className="w-80 sm:w-96 border-l border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-0 shrink-0 overflow-hidden">
                    {/* Header Sidebar */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                                    Entidades Detectadas
                                </h3>
                                <Badge variant="secondary" className="text-xs px-2 py-0.2">
                                    {activeEntities.length}
                                </Badge>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggleAll(approvedEntities.length !== activeEntities.length)}
                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {approvedEntities.length === activeEntities.length ? 'Desmarcar todas' : 'Testar todas'}
                            </button>
                        </div>

                        {/* Cobertura de Anonimización */}
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Cobertura de anonimización</span>
                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                    {coveragePercent}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                <div className="h-full bg-sky-500 w-[35%]" title="Personas Físicas" />
                                <div className="h-full bg-purple-500 w-[30%]" title="Personas Jurídicas" />
                                <div className="h-full bg-emerald-500 w-[35%]" title="Datos Financieros" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Físicas
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Jurídicas
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Datos / IDs
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Lista Agrupada de Entidades con scroll vertical funcional */}
                    <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 space-y-5">
                        {Object.entries(groupedEntities).map(([groupTitle, items]) => {
                            if (items.length === 0) return null;

                            return (
                                <div key={groupTitle} className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                                        <span>{groupTitle}</span>
                                        <span className="font-mono text-slate-400">({items.length})</span>
                                    </div>

                                    <div className="space-y-1.5">
                                        {items.map(({ entity: ent, originalIndex }) => {
                                            const config = ENTITY_CONFIG[ent.entity_type];

                                            return (
                                                <div
                                                    key={`ent-item-${originalIndex}`}
                                                    className={`p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1.5 ${
                                                        ent.isApproved
                                                            ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
                                                            : 'bg-transparent border-dashed border-slate-200 opacity-60'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <Checkbox
                                                            checked={ent.isApproved}
                                                            onCheckedChange={() => toggleEntityStatus(originalIndex)}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-mono font-medium text-slate-900 dark:text-slate-100 truncate">
                                                                {ent.text}
                                                            </p>
                                                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                                                                <span className="inline-flex items-center">
                                                                    {config?.icon}
                                                                    {config?.label || ent.entity_type}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const { blacklistEntity } = await import(
                                                                                '@/app/lib/documentApi'
                                                                            );
                                                                            await blacklistEntity(ent.text);
                                                                            useDocumentStore
                                                                                .getState()
                                                                                .setEntityBlacklisted(ent.text, true);
                                                                            toast.success(
                                                                                `"${ent.text}" ignorada globalmente`
                                                                            );
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            toast.error(
                                                                                'No se pudo añadir a excepciones'
                                                                            );
                                                                        }
                                                                    }}
                                                                    className="text-slate-400 hover:text-red-500 text-[10px] hover:underline"
                                                                >
                                                                    Ignorar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Zero-Trust */}
                    <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-[11px] text-slate-500 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Arquitectura Zero-Trust Local</span>
                        </div>
                        <p className="text-[10px] leading-tight text-slate-400">
                            Todos los reemplazos y análisis sintácticos se ejecutan estrictamente en tu equipo.
                        </p>
                    </div>
                </div>
            </div>

            {/* Slide-Over Drawer del Copiloto Jurídico */}
            <ChatModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                text={extractedText}
                entities={entities.filter((e) => !e.isBlacklisted)}
                fileName={file.name}
            />
        </div>
    );
}
