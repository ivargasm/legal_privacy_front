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
} from 'lucide-react';
import {
    uploadPublicLaw,
    getPublicLaws,
    reindexPublicLaws,
    deletePublicLaw,
    PublicLawsResponse,
    PublicLawItem,
} from '@/app/lib/documentApi';
import { useOrgStore } from '@/app/store/orgStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { toast } from 'sonner';

export default function LibraryWorkspace() {
    const { activeOrg } = useOrgStore();

    // Tab state: 'ORGANIZATION' | 'PUBLIC'
    const [activeTab, setActiveTab] = useState<'ORGANIZATION' | 'PUBLIC'>('ORGANIZATION');

    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lastUpload, setLastUpload] = useState<string | null>(null);

    const [catalog, setCatalog] = useState<PublicLawsResponse | null>(null);
    const [isLoadingLaws, setIsLoadingLaws] = useState(true);
    const [reindexingId, setReindexingId] = useState<number | 'all' | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [lawToDelete, setLawToDelete] = useState<PublicLawItem | null>(null);

    const fetchLaws = useCallback(async () => {
        setIsLoadingLaws(true);
        try {
            // Cargar con el scope activo
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

        setIsUploading(true);
        setLastUpload(null);
        const targetLabel = activeTab === 'ORGANIZATION' ? 'acervo de tu despacho' : 'biblioteca pública';
        toast.info(`Generando embeddings locales e indexando en ${targetLabel}...`);

        try {
            await uploadPublicLaw(file, activeTab);
            toast.success(`"${file.name}" subido e indexado exitosamente en el ${targetLabel}.`);
            setLastUpload(file.name);
            await fetchLaws();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Error al subir el documento.');
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
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 p-1 bg-slate-100/90 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab('ORGANIZATION')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            activeTab === 'ORGANIZATION'
                                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Building2 className="w-3.5 h-3.5" />
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
                                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Leyes Públicas & SCJN</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-slate-200/60 dark:bg-slate-700">
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
                        className="text-xs text-slate-500 hover:text-slate-900 h-8"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingLaws ? 'animate-spin' : ''}`} />
                        Refrescar
                    </Button>
                )}
            </div>

            {/* Context Notice according to tab */}
            {activeTab === 'ORGANIZATION' ? (
                <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                    <FolderLock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <strong className="text-indigo-900 dark:text-indigo-200">Aislamiento Criptográfico de Despacho:</strong>{' '}
                        Los contratos machote, formatos institucionales y precedentes indexados aquí pertenecen estrictamente a{' '}
                        <strong>{activeOrg?.name || 'tu despacho'}</strong>. Ningún otro despacho puede acceder a ellos. El Copiloto Jurídico los utiliza para auditar cláusulas contra la doctrina interna de tu firma.
                    </div>
                </div>
            ) : (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                    <Scale className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-200">Biblioteca Jurídica Federal:</strong>{' '}
                        Normativa colectiva de consulta abierta (Leyes Federales, Códigos, Tesis y Jurisprudencias SCJN). Indexadas con búsqueda híbrida RRF para fundamentación legal universal en el Chat.
                    </div>
                </div>
            )}

            {/* Motor de Embeddings Activo */}
            {catalog && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        {catalog.is_local ? (
                            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                        ) : (
                            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                                <Cloud className="w-4 h-4" />
                            </div>
                        )}
                        <div>
                            <div className="text-xs font-semibold flex items-center gap-2">
                                <span>Motor de Embeddings:</span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                    {catalog.embedding_model}
                                </span>
                                <Badge
                                    variant="secondary"
                                    className={`text-[10px] py-0 px-1.5 ${
                                        catalog.is_local
                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'
                                    }`}
                                >
                                    {catalog.is_local ? '100% Local (Ollama)' : 'Nube'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500">
                        {catalog.laws.length} {catalog.laws.length === 1 ? 'documento' : 'documentos'} en{' '}
                        {activeTab === 'ORGANIZATION' ? 'este despacho' : 'la biblioteca pública'}
                    </div>
                </div>
            )}

            {/* Zona de Carga (según permisos del scope) */}
            {canUpload ? (
                <div
                    className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-2xl transition-all bg-white dark:bg-slate-900 shadow-2xs ${
                        isDragging
                            ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                >
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mb-3">
                        {activeTab === 'ORGANIZATION' ? (
                            <FolderLock className="w-6 h-6" />
                        ) : (
                            <BookOpen className="w-6 h-6" />
                        )}
                    </div>
                    <h3 className="text-base font-semibold mb-1 text-center text-slate-900 dark:text-white">
                        {activeTab === 'ORGANIZATION'
                            ? `Subir Machote o Precedente a ${activeOrg?.name || 'tu Despacho'}`
                            : 'Subir Ley, Código o Jurisprudencia Pública'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-5 text-center max-w-md leading-relaxed">
                        Arrastra un archivo PDF o DOCX aquí (máx. 25 MB). Se segmentará mediante{' '}
                        <strong>Chunking Jurídico Estructurado</strong> e indexará con búsqueda híbrida RRF.
                    </p>

                    <input
                        type="file"
                        id="library-upload"
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={onChange}
                        disabled={isUploading || reindexingId !== null}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <p className="text-indigo-600 font-medium text-xs">
                                Validando estructura binaria e indexando vectores locales...
                            </p>
                        </div>
                    ) : (
                        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                            <label htmlFor="library-upload" className="cursor-pointer">
                                {activeTab === 'ORGANIZATION'
                                    ? 'Seleccionar Documento del Despacho'
                                    : 'Seleccionar Archivo Público'}
                            </label>
                        </Button>
                    )}

                    {lastUpload && !isUploading && (
                        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2.5 w-full max-w-md">
                            <CheckCircle2 className="text-emerald-500 w-4 h-4 shrink-0" />
                            <div className="text-xs">
                                <span className="font-medium text-emerald-900 dark:text-emerald-300">
                                    Indexación Completada:
                                </span>{' '}
                                <span className="text-emerald-700 dark:text-emerald-400 truncate">
                                    {lastUpload}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs text-slate-500 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>
                        <strong>Modo Consulta:</strong> Todos los documentos listados abajo se consultan automáticamente en tu Copiloto. Solo los{' '}
                        {activeTab === 'ORGANIZATION' ? 'socios y administradores del despacho' : 'administradores globales'}{' '}
                        pueden agregar o remover documentos en esta sección.
                    </span>
                </div>
            )}

            {/* Catálogo de Documentos Indexados */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                            {activeTab === 'ORGANIZATION'
                                ? `Acervo Interno de ${activeOrg?.name || 'tu Despacho'}`
                                : 'Leyes y Normativa Federal Pública'}{' '}
                            {catalog ? `(${catalog.laws.length})` : ''}
                        </h4>
                        <p className="text-xs text-slate-500">
                            Disponibles para recuperación contextual híbrida (BM25 + pgvector + RRF) en el Copiloto
                        </p>
                    </div>

                    {catalog && catalog.can_manage_public && activeTab === 'PUBLIC' && catalog.outdated_count > 0 && (
                        <Button
                            size="sm"
                            onClick={() => handleReindex()}
                            disabled={reindexingId !== null || isUploading}
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

                <div className="divide-y divide-slate-200/60 dark:divide-slate-800">
                    {isLoadingLaws ? (
                        <div className="p-8 flex items-center justify-center text-xs text-slate-400 gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            <span>Cargando acervo indexado...</span>
                        </div>
                    ) : !catalog || catalog.laws.length === 0 ? (
                        <div className="p-10 text-center text-xs text-slate-400 space-y-1">
                            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                            <p className="font-medium text-slate-600 dark:text-slate-400">
                                {activeTab === 'ORGANIZATION'
                                    ? 'Aún no hay contratos machote ni precedentes indexados para este despacho.'
                                    : 'Aún no hay leyes públicas indexadas.'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                {canUpload
                                    ? 'Arrastra un archivo arriba para agregarlo al acervo.'
                                    : 'Solicita al administrador subir documentos para enriquecer las consultas.'}
                            </p>
                        </div>
                    ) : (
                        catalog.laws.map((law) => (
                            <div
                                key={law.id}
                                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mt-0.5 shrink-0">
                                        {law.scope === 'ORGANIZATION' ? (
                                            <FolderLock className="w-4 h-4" />
                                        ) : (
                                            <Scale className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                            {law.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
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
                                                        ? 'border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300'
                                                        : 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400'
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
                                            disabled={reindexingId !== null || isUploading}
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
                                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
