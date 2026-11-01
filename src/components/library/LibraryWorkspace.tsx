'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BookOpen,
    CheckCircle2,
    RefreshCw,
    ShieldCheck,
    Cloud,
    AlertTriangle,
    FileText,
    Loader2,
} from 'lucide-react';
import {
    uploadPublicLaw,
    getPublicLaws,
    reindexPublicLaws,
    PublicLawsResponse,
} from '@/app/lib/documentApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function LibraryWorkspace() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lastUpload, setLastUpload] = useState<string | null>(null);

    const [catalog, setCatalog] = useState<PublicLawsResponse | null>(null);
    const [isLoadingLaws, setIsLoadingLaws] = useState(true);
    const [reindexingId, setReindexingId] = useState<number | 'all' | null>(null);

    const fetchLaws = useCallback(async () => {
        setIsLoadingLaws(true);
        try {
            const data = await getPublicLaws();
            setCatalog(data);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'No se pudo cargar el catálogo de leyes.');
        } finally {
            setIsLoadingLaws(false);
        }
    }, []);

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
        toast.info('Generando vectores e indexando ley en pgvector...');

        try {
            await uploadPublicLaw(file);
            toast.success(`Ley "${file.name}" subida e indexada exitosamente.`);
            setLastUpload(file.name);
            await fetchLaws();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Error al subir la ley.');
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

    const canManage = catalog ? Boolean(catalog.can_manage) : false;

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8">
            {/* Indicador del Motor de Embeddings Activo */}
            {catalog && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-card shadow-xs">
                    <div className="flex items-center gap-2.5">
                        {catalog.is_local ? (
                            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        ) : (
                            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                                <Cloud className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <div className="text-sm font-semibold flex items-center gap-2">
                                <span>Motor de Embeddings Activo</span>
                                <Badge
                                    variant="secondary"
                                    className={
                                        catalog.is_local
                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'
                                    }
                                >
                                    {catalog.is_local ? '100% Local (Ollama)' : 'Nube'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                                {catalog.embedding_model}
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLaws}
                        disabled={isLoadingLaws || reindexingId !== null}
                        className="text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingLaws ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </div>
            )}

            {/* Zona de Carga (Exclusiva para rol Administrador) */}
            {canManage ? (
                <div
                    className={`flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-xl transition-colors bg-card ${
                        isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
                    }`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                >
                    <BookOpen className="w-14 h-14 text-indigo-500 mb-3" />
                    <h3 className="text-xl font-semibold mb-1.5 text-center">Subir Ley, Código o Jurisprudencia</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-lg">
                        Arrastra un archivo PDF o DOCX aquí (máx. 25 MB). Al ser normativa pública, se estructura e indexa en PostgreSQL + pgvector usando el motor de embeddings activo.
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
                        <div className="flex flex-col items-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="text-indigo-600 font-medium text-sm">
                                Validando archivo y estructurando unidades jurídicas...
                            </p>
                        </div>
                    ) : (
                        <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                            <label htmlFor="library-upload" className="cursor-pointer">
                                Seleccionar Archivo Público
                            </label>
                        </Button>
                    )}

                    {lastUpload && !isUploading && (
                        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-3 w-full">
                            <CheckCircle2 className="text-emerald-500 w-6 h-6 shrink-0" />
                            <div>
                                <p className="font-medium text-emerald-900 dark:text-emerald-400">
                                    Indexación Completada
                                </p>
                                <p className="text-sm text-emerald-700 dark:text-emerald-500">
                                    {lastUpload} ahora está disponible en el Cerebro Público.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                catalog && (
                    <div className="px-4 py-3 rounded-xl border bg-muted/40 text-xs text-muted-foreground flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>
                            <strong>Modo Consulta:</strong> Todas las leyes listadas abajo se consultan automáticamente en tu Chat Seguro. Solo los administradores pueden subir o re-indexar normativa global.
                        </span>
                    </div>
                )
            )}

            {/* Catálogo de Leyes Indexadas + Re-indexación en 1 clic */}
            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 bg-muted/30">
                    <div>
                        <h4 className="font-semibold text-base">
                            Acervo Jurídico Indexado {catalog ? `(${catalog.laws.length})` : ''}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Documentos públicos disponibles para consulta cruzada en el Chat Seguro
                        </p>
                    </div>

                    {canManage && catalog && catalog.outdated_count > 0 && (
                        <Button
                            size="sm"
                            onClick={() => handleReindex()}
                            disabled={reindexingId !== null || isUploading}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
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

                {canManage && catalog && catalog.outdated_count > 0 && (
                    <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                            Detectamos {catalog.outdated_count}{' '}
                            {catalog.outdated_count === 1 ? 'ley pendiente' : 'leyes pendientes'} de actualizar al
                            nuevo motor de <strong>Chunking Jurídico por Artículos/Tesis + Búsqueda Híbrida</strong> o al modelo activo.
                            Haz clic en <strong>Actualizar</strong> para re-estructurarla sin volver a subir el PDF.
                        </span>
                    </div>
                )}

                <div className="divide-y">
                    {isLoadingLaws ? (
                        <div className="p-8 flex items-center justify-center text-sm text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Cargando leyes indexadas...</span>
                        </div>
                    ) : !catalog || catalog.laws.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            Aún no hay leyes públicas indexadas en PostgreSQL.
                        </div>
                    ) : (
                        catalog.laws.map((law) => (
                            <div
                                key={law.id}
                                className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 mt-0.5 shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{law.title}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span>{law.chunks_count} fragmentos</span>
                                            <span>•</span>
                                            <span className="font-mono">
                                                {law.embedding_model}
                                                {law.embedding_dim ? ` (${law.embedding_dim}d)` : ''}
                                            </span>
                                            <span>•</span>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    law.is_structured
                                                        ? 'text-[10px] py-0 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300'
                                                        : 'text-[10px] py-0 border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400'
                                                }
                                            >
                                                {law.is_structured
                                                    ? 'Artículos / Tesis + FTS Híbrido'
                                                    : 'Corte fijo legado'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {canManage && law.needs_reindex ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReindex(law.id)}
                                            disabled={reindexingId !== null || isUploading}
                                            className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs"
                                        >
                                            {reindexingId === law.id ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            Actualizar estructura
                                        </Button>
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                        >
                                            {law.needs_reindex ? 'Disponible' : 'Sincronizado'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
