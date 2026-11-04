'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BookOpen,
    CheckCircle2,
    RefreshCw,
    ShieldCheck,
    Cloud,
    FileText,
    Loader2,
    Building2,
    Trash2,
    Scale,
    FolderLock,
    Sparkles,
} from 'lucide-react';
import {
    uploadPublicLaw,
    analyzeDocument,
    getPublicLaws,
    reindexPublicLaws,
    deletePublicLaw,
    PublicLawsResponse,
    PublicLawItem,
} from '@/app/lib/documentApi';
import { PIIEntity } from '@/app/store/documentStore';
import { useOrgStore } from '@/app/store/orgStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { SanitizePrecedentModal } from './SanitizePrecedentModal';
import { toast } from 'sonner';

export default function LibraryWorkspace() {
    const { activeOrg } = useOrgStore();

    // Tab state: 'ORGANIZATION' | 'PUBLIC'
    const [activeTab, setActiveTab] = useState<'ORGANIZATION' | 'PUBLIC'>('ORGANIZATION');

    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzingPrecedent, setIsAnalyzingPrecedent] = useState(false);
    const [lastUpload, setLastUpload] = useState<string | null>(null);

    // Estado del modal de sanitización interactiva para machotes del despacho
    const [sanitizeModalOpen, setSanitizeModalOpen] = useState(false);
    const [precedentPayload, setPrecedentPayload] = useState<{
        file: File;
        extractedText: string;
        entities: PIIEntity[];
    } | null>(null);

    const [catalog, setCatalog] = useState<PublicLawsResponse | null>(null);
    const [isLoadingLaws, setIsLoadingLaws] = useState(true);
    const [reindexingId, setReindexingId] = useState<number | 'all' | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [lawToDelete, setLawToDelete] = useState<PublicLawItem | null>(null);

    const fetchLaws = useCallback(async () => {
        setIsLoadingLaws(true);
        try {
            const data = await getPublicLaws(activeTab);
            setCatalog(data);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'No se pudo cargar el acervo legal.');
        } finally {
            setIsLoadingLaws(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchLaws();
    }, [fetchLaws]);

    const handleFile = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.docx')) {
            toast.error('Formato no soportado. Sube un PDF o DOCX.');
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast.error('El archivo supera el tamaño máximo permitido de 25 MB.');
            return;
        }

        // FLUJO B: Acervo del Despacho (Human-in-the-Loop Zero-Trust)
        if (activeTab === 'ORGANIZATION') {
            setIsAnalyzingPrecedent(true);
            setLastUpload(null);
            toast.info('Extrayendo texto y detectando datos confidenciales localmente con Zero-Trust...');

            try {
                const res = await analyzeDocument(file, activeOrg?.id);
                setPrecedentPayload({
                    file,
                    extractedText: res.extracted_text || '',
                    entities: res.entities || [],
                });
                setSanitizeModalOpen(true);
            } catch (error) {
                console.error(error);
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error al analizar el documento para sanitización.'
                );
            } finally {
                setIsAnalyzingPrecedent(false);
            }
            return;
        }

        // FLUJO A: Biblioteca Pública y Federal (SCJN)
        setIsUploading(true);
        setLastUpload(null);
        toast.info('Generando embeddings locales e indexando en la biblioteca pública...');

        try {
            await uploadPublicLaw(file, 'PUBLIC');
            toast.success(`"${file.name}" subido e indexado exitosamente en la biblioteca pública.`);
            setLastUpload(file.name);
            await fetchLaws();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Error al subir el documento público.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleReindex = async (documentId?: number) => {
        setReindexingId(documentId ?? 'all');
        toast.info('Estructurando por Artículos/Tesis e indexando vectores + búsqueda híbrida...');
        try {
            const res = await reindexPublicLaws(documentId);
            toast.success(
                `Listo: ${res.reindexed_chunks} unidades jurídicas indexadas con ${res.embedding_model}.`
            );
            await fetchLaws();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Error al re-indexar.');
        } finally {
            setReindexingId(null);
        }
    };

    const handleConfirmDelete = async () => {
        if (!lawToDelete) return;

        setDeletingId(lawToDelete.id);
        try {
            await deletePublicLaw(lawToDelete.id);
            toast.success(`"${lawToDelete.title}" ha sido eliminado del acervo.`);
            setLawToDelete(null);
            await fetchLaws();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Error al eliminar documento.');
        } finally {
            setDeletingId(null);
        }
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    // Permisos según el scope activo
    const canUpload =
        activeTab === 'ORGANIZATION'
            ? catalog?.can_manage_firm
            : catalog?.can_manage_public;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Tabs Selector: Acervo del Despacho vs Leyes Públicas */}
            <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-border">
                    <button
                        type="button"
                        onClick={() => setActiveTab('ORGANIZATION')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            activeTab === 'ORGANIZATION'
                                ? 'bg-card text-foreground shadow-2xs font-semibold border border-border/80'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        <span>Acervo del Despacho</span>
                        {activeOrg && (
                            <span className="text-[10px] font-mono opacity-70">
                                ({activeOrg.name})
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('PUBLIC')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            activeTab === 'PUBLIC'
                                ? 'bg-card text-foreground shadow-2xs font-semibold border border-border/80'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Scale className="w-3.5 h-3.5 text-primary" />
                        <span>Leyes Públicas & SCJN</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-muted">
                            Federal
                        </Badge>
                    </button>
                </div>

                {catalog && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchLaws}
                        disabled={isLoadingLaws || reindexingId !== null}
                        className="text-xs text-muted-foreground hover:text-foreground h-8"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingLaws ? 'animate-spin' : ''}`} />
                        Refrescar
                    </Button>
                )}
            </div>

            {/* Context Notice according to tab */}
            {activeTab === 'ORGANIZATION' ? (
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground flex items-start gap-2.5">
                    <FolderLock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <strong className="text-foreground">Aislamiento Criptográfico de Despacho (Zero-Trust):</strong>{' '}
                        Los contratos machote y formatos institucionales indexados aquí pertenecen estrictamente a{' '}
                        <strong>{activeOrg?.name || 'tu despacho'}</strong>. Al subir un archivo, podrás revisar y sustituir
                        nombres, RFCs y domicilios reales por marcadores estándar (Human-in-the-Loop) para que tu acervo esté 100% anonimizado antes de calcular embeddings.
                    </div>
                </div>
            ) : (
                <div className="p-3.5 rounded-xl border border-border bg-card text-xs text-muted-foreground flex items-start gap-2.5">
                    <Scale className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <strong className="text-foreground">Biblioteca Jurídica Federal:</strong>{' '}
                        Normativa colectiva de consulta abierta (Leyes Federales, Códigos, Tesis y Jurisprudencias SCJN). Indexadas con búsqueda híbrida RRF para fundamentación legal universal en el Chat.
                    </div>
                </div>
            )}

            {/* Motor de Embeddings Activo */}
            {catalog && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        {catalog.is_local ? (
                            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                        ) : (
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <Cloud className="w-4 h-4" />
                            </div>
                        )}
                        <div>
                            <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                                <span>Motor de Embeddings:</span>
                                <span className="font-mono text-muted-foreground">
                                    {catalog.embedding_model}
                                </span>
                                <Badge
                                    variant="secondary"
                                    className={`text-[10px] py-0 px-1.5 ${
                                        catalog.is_local
                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-primary/10 text-primary'
                                    }`}
                                >
                                    {catalog.is_local ? '100% Local (Ollama)' : 'Nube'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        {catalog.laws.length} {catalog.laws.length === 1 ? 'documento' : 'documentos'} en{' '}
                        {activeTab === 'ORGANIZATION' ? 'este despacho' : 'la biblioteca pública'}
                    </div>
                </div>
            )}

            {/* Zona de Carga (según permisos del scope) */}
            {canUpload ? (
                <div
                    className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-2xl transition-all bg-card shadow-2xs ${
                        isDragging
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                    }`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 border border-primary/20">
                        {activeTab === 'ORGANIZATION' ? (
                            <Sparkles className="w-6 h-6" />
                        ) : (
                            <BookOpen className="w-6 h-6" />
                        )}
                    </div>
                    <h3 className="text-base font-semibold mb-1 text-center text-foreground">
                        {activeTab === 'ORGANIZATION'
                            ? `Subir Machote o Precedente a ${activeOrg?.name || 'tu Despacho'}`
                            : 'Subir Ley, Código o Jurisprudencia Pública'}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-5 text-center max-w-md leading-relaxed">
                        {activeTab === 'ORGANIZATION' ? (
                            <>
                                Arrastra un archivo PDF o DOCX aquí. Pasará por el{' '}
                                <strong className="text-foreground">Estudio de Sanitización Zero-Trust</strong> para
                                reemplazar datos reales por marcadores antes de guardarse en el acervo.
                            </>
                        ) : (
                            <>
                                Arrastra un archivo PDF o DOCX aquí (máx. 25 MB). Se segmentará mediante{' '}
                                <strong className="text-foreground">Chunking Jurídico Estructurado</strong> e indexará
                                con búsqueda híbrida RRF.
                            </>
                        )}
                    </p>

                    <input
                        type="file"
                        id="library-upload"
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={onChange}
                        disabled={isUploading || isAnalyzingPrecedent || reindexingId !== null}
                    />

                    {isAnalyzingPrecedent ? (
                        <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-primary font-medium text-xs">
                                Extrayendo texto y detectando datos confidenciales localmente...
                            </p>
                        </div>
                    ) : isUploading ? (
                        <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-primary font-medium text-xs">
                                Validando estructura binaria e indexando vectores locales...
                            </p>
                        </div>
                    ) : (
                        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
                            <label htmlFor="library-upload" className="cursor-pointer">
                                {activeTab === 'ORGANIZATION'
                                    ? 'Seleccionar Contrato o Machote'
                                    : 'Seleccionar Archivo Público'}
                            </label>
                        </Button>
                    )}

                    {lastUpload && !isUploading && !isAnalyzingPrecedent && (
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2.5 w-full max-w-md">
                            <CheckCircle2 className="text-emerald-500 w-4 h-4 shrink-0" />
                            <div className="text-xs">
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    Indexación Completada:
                                </span>{' '}
                                <span className="text-foreground truncate">
                                    {lastUpload}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="px-4 py-3 rounded-xl border border-border bg-card text-xs text-muted-foreground flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <span>
                        <strong className="text-foreground">Modo Consulta:</strong> Todos los documentos listados abajo se consultan automáticamente en tu Copiloto. Solo los{' '}
                        {activeTab === 'ORGANIZATION' ? 'socios y administradores del despacho' : 'administradores globales'}{' '}
                        pueden agregar o remover documentos en esta sección.
                    </span>
                </div>
            )}

            {/* Catálogo de Documentos Indexados */}
            <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/30">
                    <div>
                        <h4 className="font-semibold text-sm text-foreground">
                            {activeTab === 'ORGANIZATION'
                                ? `Acervo Interno de ${activeOrg?.name || 'tu Despacho'}`
                                : 'Leyes y Normativa Federal Pública'}{' '}
                            {catalog ? `(${catalog.laws.length})` : ''}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Disponibles para recuperación contextual híbrida (BM25 + pgvector + RRF) en el Copiloto
                        </p>
                    </div>

                    {catalog && catalog.can_manage_public && activeTab === 'PUBLIC' && catalog.outdated_count > 0 && (
                        <Button
                            size="sm"
                            onClick={() => handleReindex()}
                            disabled={reindexingId !== null || isUploading || isAnalyzingPrecedent}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                        >
                            {reindexingId === 'all' ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Actualizar estructura e índice ({catalog.outdated_count})
                        </Button>
                    )}
                </div>

                <div className="divide-y divide-border">
                    {isLoadingLaws ? (
                        <div className="p-8 flex items-center justify-center text-xs text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span>Cargando acervo indexado...</span>
                        </div>
                    ) : !catalog || catalog.laws.length === 0 ? (
                        <div className="p-10 text-center text-xs text-muted-foreground space-y-1">
                            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="font-medium text-foreground">
                                {activeTab === 'ORGANIZATION'
                                    ? 'Aún no hay contratos machote ni precedentes indexados para este despacho.'
                                    : 'Aún no hay leyes públicas indexadas.'}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                {canUpload
                                    ? 'Arrastra un archivo arriba para sanitizarlo e indexarlo en el acervo.'
                                    : 'Solicita al administrador subir documentos para enriquecer las consultas.'}
                            </p>
                        </div>
                    ) : (
                        catalog.laws.map((law) => (
                            <div
                                key={law.id}
                                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0 border border-primary/20">
                                        {law.scope === 'ORGANIZATION' ? (
                                            <FolderLock className="w-4 h-4" />
                                        ) : (
                                            <Scale className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-xs sm:text-sm text-foreground truncate">
                                            {law.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                            <span>{law.chunks_count} fragmentos jurídicos</span>
                                            <span>•</span>
                                            <span className="font-mono">
                                                {law.embedding_model}
                                                {law.embedding_dim ? ` (${law.embedding_dim}d)` : ''}
                                            </span>
                                            <span>•</span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] py-0 px-1.5 ${
                                                    law.is_structured
                                                        ? 'border-primary/30 text-primary bg-primary/5'
                                                        : 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                                                }`}
                                            >
                                                {law.is_structured
                                                    ? 'Chunking Legal + FTS'
                                                    : 'Corte fijo legado'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {law.can_manage && law.needs_reindex && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReindex(law.id)}
                                            disabled={reindexingId !== null || isUploading || isAnalyzingPrecedent}
                                            className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs h-7"
                                        >
                                            {reindexingId === law.id ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                            )}
                                            Actualizar
                                        </Button>
                                    )}

                                    {law.can_manage && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setLawToDelete(law)}
                                            disabled={deletingId === law.id}
                                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                            title="Eliminar documento del acervo"
                                        >
                                            {deletingId === law.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Sanitización Previa al Indexado (Human-in-the-Loop Zero-Trust) */}
            <SanitizePrecedentModal
                isOpen={sanitizeModalOpen}
                onClose={() => {
                    setSanitizeModalOpen(false);
                    setPrecedentPayload(null);
                }}
                file={precedentPayload?.file ?? null}
                extractedText={precedentPayload?.extractedText ?? ''}
                entities={precedentPayload?.entities ?? []}
                onSuccess={async () => {
                    if (precedentPayload?.file?.name) {
                        setLastUpload(precedentPayload.file.name);
                    }
                    await fetchLaws();
                }}
                activeOrgName={activeOrg?.name}
                activeOrgId={activeOrg?.id}
            />

            {/* Modal de Confirmación: Eliminar Documento */}
            <ConfirmModal
                isOpen={lawToDelete !== null}
                onClose={() => setLawToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Documento del Acervo"
                description={
                    lawToDelete
                        ? `¿Estás seguro de eliminar "${lawToDelete.title}" del acervo? Sus fragmentos jurídicos y vectores locales serán eliminados permanentemente.`
                        : ''
                }
                confirmText="Eliminar Documento"
                cancelText="Cancelar"
                variant="destructive"
                isLoading={deletingId !== null}
            />
        </div>
    );
}
