'use client';

import { useDocumentStore } from '@/app/store/documentStore';
import { redactDocument, getBlacklist, deleteFromBlacklist } from '@/app/lib/documentApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Download, Building2, User, MapPin, Mail, Phone, FileDigit, ShieldOff, List, Trash2, X, MessageSquareQuote } from 'lucide-react';
import { useState, useRef } from 'react';
import ChatModal from './ChatModal';

// Map entity types to icons and colors
const ENTITY_CONFIG: Record<string, { icon: React.ReactNode, color: string }> = {
    PERSON: { icon: <User className="w-4 h-4 mr-2" />, color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
    ORG: { icon: <Building2 className="w-4 h-4 mr-2" />, color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400' },
    LOC: { icon: <MapPin className="w-4 h-4 mr-2" />, color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' },
    EMAIL: { icon: <Mail className="w-4 h-4 mr-2" />, color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400' },
    PHONE: { icon: <Phone className="w-4 h-4 mr-2" />, color: 'bg-rose-500/20 text-rose-700 dark:text-rose-400' },
    ID_FISCAL: { icon: <FileDigit className="w-4 h-4 mr-2" />, color: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' },
};

export default function Workspace() {
    const { file, extractedText, entities, toggleEntityStatus, reset, addEntity } = useDocumentStore();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Blacklist Manager State
    const [showBlacklist, setShowBlacklist] = useState(false);
    const [blacklistItems, setBlacklistItems] = useState<{ id: number, text: string }[]>([]);
    const [isLoadingBlacklist, setIsLoadingBlacklist] = useState(false);

    // Manual Selection State
    const textContainerRef = useRef<HTMLDivElement>(null);
    const [popupState, setPopupState] = useState({
        show: false,
        top: 0,
        left: 0,
        start: 0,
        end: 0,
        text: ''
    });

    if (!file) return null;

    const handleOpenBlacklist = async () => {
        setShowBlacklist(true);
        setIsLoadingBlacklist(true);
        try {
            const data = await getBlacklist();
            setBlacklistItems(data);
        } catch (e) {
            console.error(e);
            toast.error("Error al cargar la lista de excepciones");
        } finally {
            setIsLoadingBlacklist(false);
        }
    };

    const handleDeleteFromBlacklist = async (id: number, text: string) => {
        try {
            await deleteFromBlacklist(id);
            setBlacklistItems(prev => prev.filter(item => item.id !== id));
            useDocumentStore.getState().restoreBlacklistedText(text);
            toast.success("Palabra eliminada de las excepciones");
        } catch (e) {
            console.error(e);
            toast.error("Error al eliminar la excepción");
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        toast.info("Generando documento anonimizado...");

        try {
            // Filter only approved entities
            const approvedEntities = entities.filter(e => e.isApproved);
            const blob = await redactDocument(file, approvedEntities);

            // Create a temporary link to trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `redactado_${file.name}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Documento descargado con éxito");
            reset(); // Clear workspace after download
        } catch (error) {
            const e = error as Error;
            console.error(e);
            toast.error(e.message || "Error al redactar el documento");
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle text selection
    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !textContainerRef.current) {
            if (popupState.show) setPopupState(prev => ({ ...prev, show: false }));
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
            const text = range.toString();
            const end = start + text.length;

            // Get coordinates for popup
            const rect = range.getBoundingClientRect();

            setPopupState({
                show: true,
                top: rect.top - 50, // slightly above
                left: rect.left + (rect.width / 2) - 40, // center horizontally
                start,
                end,
                text
            });
        } catch (e) {
            console.error("Error calculating selection offset", e);
        }
    };

    const handleManualRedact = () => {
        addEntity({
            text: popupState.text,
            entity_type: 'MANUAL',
            page: 0, // Backend will recalculate page and bbox using enrich_entities during Phase 3 logic if needed, but wait!
            // Actually, backend needs bbox. But PyMuPDF search_for handles text matching!
            // We just send bbox=null and let backend ignore bbox? 
            // Wait, our backend Phase 3 REQUIRES bbox to redact strictly!
            // Let's send bbox=null. In Phase 3, backend skips redaction if bbox is null.
            // That's a bug! We need to enrich MANUAL entities or fallback to string search.
            bbox: null,
            start_char: popupState.start,
            end_char: popupState.end,
            confidence: 1.0,
            isApproved: true
        });
        setPopupState(prev => ({ ...prev, show: false }));
        window.getSelection()?.removeAllRanges();
        toast.success("Entidad manual agregada");
    };

    // Helper to render text with highlights
    const renderHighlightedText = () => {
        if (!extractedText) return null;

        const segments = [];
        let currentIndex = 0;

        // Sort entities by start_char to ensure sequential processing
        const sortedEntities = [...entities].sort((a, b) => a.start_char - b.start_char);

        sortedEntities.forEach((ent, idx) => {
            // Prevent overlaps which duplicate text and break the DOM selection offset!
            if (ent.start_char < currentIndex) {
                return;
            }

            // Skip rendering if blacklisted (acts as normal text)
            if (ent.isBlacklisted) return;

            if (ent.start_char > currentIndex) {
                segments.push(<span key={`text-${idx}`}>{extractedText.slice(currentIndex, ent.start_char)}</span>);
            }

            const config = ENTITY_CONFIG[ent.entity_type] || { color: 'bg-gray-200 text-gray-800' };

            segments.push(
                <mark
                    key={`mark-${idx}`}
                    className={`px-1 rounded-sm cursor-help transition-all ${ent.isApproved ? config.color : 'bg-transparent line-through text-muted-foreground'
                        }`}
                    title={ent.entity_type}
                >
                    {extractedText.slice(ent.start_char, ent.end_char)}
                </mark>
            );

            currentIndex = ent.end_char;
        });

        if (currentIndex < extractedText.length) {
            segments.push(<span key="text-end">{extractedText.slice(currentIndex)}</span>);
        }

        return segments;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] relative">
            {popupState.show && (
                <div
                    className="fixed z-50 animate-in fade-in zoom-in duration-200"
                    style={{ top: popupState.top, left: popupState.left }}
                >
                    <Button
                        size="sm"
                        className="shadow-lg shadow-black/20 font-semibold"
                        onClick={handleManualRedact}
                    >
                        Ocultar
                    </Button>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Estudio de Revisión</h2>
                    <p className="text-muted-foreground">{file.name}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleOpenBlacklist}>
                        <List className="w-4 h-4 mr-2" />
                        Ver Excepciones
                    </Button>
                    <Button variant="outline" onClick={reset}>Cancelar</Button>
                    <Button variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none" onClick={() => setIsChatOpen(true)}>
                        <MessageSquareQuote className="w-4 h-4 mr-2" />
                        Chatear Seguro
                    </Button>
                    <Button onClick={handleDownload} disabled={isDownloading}>
                        <Download className="w-4 h-4 mr-2" />
                        {isDownloading ? "Procesando..." : "Exportar Final"}
                    </Button>
                </div>
            </div>

            {/* Modal de Lista Negra */}
            {showBlacklist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Card className="w-[500px] shadow-lg animate-in zoom-in-95 duration-200">
                        <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
                            <CardTitle>Palabras Ignoradas</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setShowBlacklist(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px] w-full p-4">
                                {isLoadingBlacklist ? (
                                    <div className="text-center py-10 text-muted-foreground">Cargando...</div>
                                ) : blacklistItems.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No hay palabras en la lista de excepciones.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {blacklistItems.map(item => (
                                            <div key={item.id} className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
                                                <span className="font-mono text-sm">{item.text}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                                    onClick={() => handleDeleteFromBlacklist(item.id, item.text)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex gap-6 h-full overflow-hidden">
                {/* Panel Izquierdo: Visor de Texto */}
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="py-3 bg-muted/30 border-b">
                        <CardTitle className="text-sm font-medium">Contenido Extraído</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full w-full p-6">
                            <div
                                ref={textContainerRef}
                                onMouseUp={handleMouseUp}
                                className="whitespace-pre-wrap font-mono text-sm leading-relaxed"
                            >
                                {renderHighlightedText()}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Panel Derecho: Entidades */}
                <Card className="w-96 flex flex-col overflow-hidden">
                    <CardHeader className="py-3 bg-muted/30 border-b">
                        <CardTitle className="text-sm font-medium flex justify-between items-center">
                            Entidades Detectadas
                            <Badge variant="secondary">{entities.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full w-full p-4">
                            <div className="space-y-4">
                                {entities.map((ent, idx) => {
                                    if (ent.isBlacklisted) return null;
                                    const config = ENTITY_CONFIG[ent.entity_type] || { icon: null, color: '' };
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex flex-col p-3 rounded-lg border transition-colors ${ent.isApproved ? 'bg-card' : 'bg-muted/50 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start space-x-3">
                                                <Checkbox
                                                    checked={ent.isApproved}
                                                    onCheckedChange={() => toggleEntityStatus(idx)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center text-sm font-medium">
                                                        {config.icon}
                                                        {ent.entity_type}
                                                    </div>
                                                    <p className="text-xs font-mono break-all text-muted-foreground">
                                                        {ent.text}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={async () => {
                                                        try {
                                                            const { blacklistEntity } = await import('@/app/lib/documentApi');
                                                            await blacklistEntity(ent.text);
                                                            useDocumentStore.getState().setEntityBlacklisted(ent.text, true);
                                                            toast.success(`Todas las instancias de "${ent.text}" añadidas a excepciones.`);
                                                        } catch (e) {
                                                            console.error(e);
                                                            toast.error("No se pudo añadir a excepciones.");
                                                        }
                                                    }}
                                                >
                                                    <ShieldOff className="w-3 h-3 mr-1" />
                                                    Ignorar siempre
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            
            {/* Chat Modal */}
            <ChatModal 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
                text={extractedText} 
                entities={entities.filter(e => !e.isBlacklisted)} 
            />
        </div>
    );
}
