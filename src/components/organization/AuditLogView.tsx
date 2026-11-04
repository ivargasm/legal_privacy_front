'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheck,
    FileText,
    Download,
    RefreshCw,
    Filter,
    Shield,
    Users,
    FolderKanban,
    Lock,
    UserCheck,
    Ban,
    Clock,
    FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AuditLogItem,
    AuditMetricsResponse,
    fetchAuditLogs,
    fetchAuditMetrics,
    downloadAuditLogsCsv,
} from '@/app/lib/orgApi';
import { toast } from 'sonner';

interface AuditLogViewProps {
    orgId: number;
    orgSlug: string;
    isOwnerOrAdmin: boolean;
}

export default function AuditLogView({ orgId, orgSlug, isOwnerOrAdmin }: AuditLogViewProps) {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [metrics, setMetrics] = useState<AuditMetricsResponse | null>(null);
    const [totalLogs, setTotalLogs] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

    // Filters
    const [actionFilter, setActionFilter] = useState<string>('ALL');
    const [page, setPage] = useState(0);
    const pageSize = 15;

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [logsData, metricsData] = await Promise.all([
                fetchAuditLogs(orgId, {
                    limit: pageSize,
                    offset: page * pageSize,
                    action: actionFilter,
                }),
                fetchAuditMetrics(orgId),
            ]);
            setLogs(logsData.items);
            setTotalLogs(logsData.total);
            setMetrics(metricsData);
        } catch (error) {
            console.error('Error cargando auditoría:', error);
            toast.error(error instanceof Error ? error.message : 'No se pudo cargar la bitácora de auditoría');
        } finally {
            setIsLoading(false);
        }
    }, [orgId, page, actionFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDownloadCsv = async () => {
        setIsDownloadingCsv(true);
        toast.info('Generando reporte CSV de auditoría...');
        try {
            await downloadAuditLogsCsv(orgId, `bitacora_auditoria_${orgSlug}.csv`);
            toast.success('Reporte de auditoría descargado exitosamente');
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Error al exportar CSV');
        } finally {
            setIsDownloadingCsv(false);
        }
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'DOC_ANALYZED':
                return (
                    <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] gap-1 font-medium">
                        <FileText className="w-3 h-3 text-indigo-600" />
                        <span>Análisis de Contrato</span>
                    </Badge>
                );
            case 'DOC_EXPORTED':
                return (
                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] gap-1 font-medium">
                        <Download className="w-3 h-3 text-emerald-600" />
                        <span>Exportación Dictamen Word</span>
                    </Badge>
                );
            case 'DOC_REDACTED':
                return (
                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px] gap-1 font-medium">
                        <Shield className="w-3 h-3 text-purple-600" />
                        <span>Descarga Testada</span>
                    </Badge>
                );
            case 'LAW_UPLOADED':
                return (
                    <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 text-[11px] gap-1 font-medium">
                        <FolderKanban className="w-3 h-3 text-cyan-600" />
                        <span>Alta en Acervo Privado</span>
                    </Badge>
                );
            case 'LAW_DELETED':
                return (
                    <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[11px] gap-1 font-medium">
                        <Ban className="w-3 h-3 text-rose-600" />
                        <span>Baja de Acervo</span>
                    </Badge>
                );
            case 'MEMBER_INVITED':
                return (
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[11px] gap-1 font-medium">
                        <Users className="w-3 h-3 text-amber-600" />
                        <span>Invitación Enviada</span>
                    </Badge>
                );
            case 'MEMBER_REMOVED':
                return (
                    <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[11px] gap-1 font-medium">
                        <Ban className="w-3 h-3 text-rose-600" />
                        <span>Miembro Removido</span>
                    </Badge>
                );
            case 'MEMBER_STATUS_CHANGED':
                return (
                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-[11px] gap-1 font-medium">
                        <UserCheck className="w-3 h-3 text-slate-500" />
                        <span>Cambio de Estado</span>
                    </Badge>
                );
            case 'MEMBER_ROLE_CHANGED':
                return (
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] gap-1 font-medium">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span>Cambio de Rol</span>
                    </Badge>
                );
            case 'BLACKLIST_ADD':
            case 'BLACKLIST_REMOVE':
                return (
                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[11px] gap-1 font-medium">
                        <span>Regla de Excepción</span>
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[11px] font-mono">
                        {action}
                    </Badge>
                );
        }
    };

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString('es-MX', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return isoString;
        }
    };

    const totalPages = Math.ceil(totalLogs / pageSize);

    if (!isOwnerOrAdmin) {
        return (
            <div className="p-8 text-center bg-card rounded-xl border border-border space-y-3">
                <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="font-semibold text-foreground">Acceso Restringido</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    La bitácora de auditoría y reportes de cumplimiento son exclusivos para Socios Directores y Administradores del despacho.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top KPI Cards (LexControl Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                        <span>PII Blindada en Servidor</span>
                        <div className="w-8 h-8 rounded-lg bg-muted text-emerald-600 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {metrics?.total_pii_shielded ?? 0}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Datos confidenciales anonimizados localmente
                    </p>
                </div>

                <div className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                        <span>Análisis de Contratos</span>
                        <div className="w-8 h-8 rounded-lg bg-muted text-primary flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {metrics?.month_docs_analyzed ?? 0}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                            / {metrics?.total_docs_analyzed ?? 0} total
                        </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Expedientes procesados en el ciclo actual
                    </p>
                </div>

                <div className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                        <span>Dictámenes Exportados</span>
                        <div className="w-8 h-8 rounded-lg bg-muted text-accent-foreground flex items-center justify-center">
                            <Download className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {metrics?.total_exports ?? 0}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Documentos Word (.docx) y testados descargados
                    </p>
                </div>

                <div className="p-5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                        <span>Gobernanza Zero Data</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                        Cero Retención Externa
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        0 bytes de contratos crudos almacenados en la base de datos central.
                    </p>
                </div>
            </div>

            {/* Header / Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-4 h-4 text-muted-foreground mr-1" />
                    <span className="text-xs text-muted-foreground font-medium">Filtrar por:</span>
                    <select
                        value={actionFilter}
                        onChange={(e) => {
                            setActionFilter(e.target.value);
                            setPage(0);
                        }}
                        className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                        <option value="ALL">Todas las acciones ({totalLogs})</option>
                        <option value="DOC_ANALYZED">Análisis de Documentos</option>
                        <option value="DOC_EXPORTED">Dictámenes Word Exportados</option>
                        <option value="DOC_REDACTED">Documentos Testados</option>
                        <option value="LAW_UPLOADED">Altas en Acervo del Despacho</option>
                        <option value="LAW_DELETED">Bajas de Acervo</option>
                        <option value="MEMBER_INVITED">Invitaciones a Miembros</option>
                        <option value="MEMBER_REMOVED">Remoción de Miembros</option>
                        <option value="MEMBER_ROLE_CHANGED">Cambios de Rol</option>
                        <option value="MEMBER_STATUS_CHANGED">Suspensiones / Activaciones</option>
                    </select>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadData}
                        disabled={isLoading}
                        className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCsv}
                        disabled={isDownloadingCsv || logs.length === 0}
                        className="text-xs h-8 border-border text-foreground hover:bg-muted gap-1.5 shadow-xs cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isDownloadingCsv ? 'Descargando...' : 'Descargar Bitácora (CSV)'}</span>
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-muted-foreground">
                        <thead className="bg-muted/60 text-foreground border-b border-border font-medium">
                            <tr>
                                <th className="px-4 py-3.5">Fecha y Hora</th>
                                <th className="px-4 py-3.5">Abogado</th>
                                <th className="px-4 py-3.5">Operación</th>
                                <th className="px-4 py-3.5">Documento / Destino</th>
                                <th className="px-4 py-3.5">Detalles de Privacidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {isLoading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                                        <span>Cargando bitácora de auditoría...</span>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                        <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                        <span>No hay registros de auditoría para el filtro seleccionado.</span>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="font-medium text-foreground">
                                                {log.username}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {log.email}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                                            {log.target_name || log.entity_text || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] text-muted-foreground">
                                            {log.details ? (
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {log.details.pii_detected !== undefined && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                                                            {String(log.details.pii_detected)} PII protegidas
                                                        </span>
                                                    )}
                                                    {Boolean(log.details.doc_kind) && (
                                                        <span className="uppercase text-[9px] font-mono font-semibold px-1 py-0.5 rounded bg-muted text-foreground">
                                                            {String(log.details.doc_kind)}
                                                        </span>
                                                    )}
                                                    {Boolean(log.details.export_format) && (
                                                        <span className="text-[10px] font-mono text-primary font-semibold">
                                                            Formato {String(log.details.export_format)}
                                                        </span>
                                                    )}
                                                    {Boolean(log.details.new_role) && (
                                                        <span className="text-[10px] font-medium text-accent-foreground">
                                                            Nuevo rol: {String(log.details.new_role)}
                                                        </span>
                                                    )}
                                                    {Boolean(log.details.chunks_count) && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {String(log.details.chunks_count)} fragmentos jurídicos
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Página {page + 1} de {totalPages} ({totalLogs} eventos registrados)
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 0 || isLoading}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                className="text-xs h-7 px-2.5"
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page + 1 >= totalPages || isLoading}
                                onClick={() => setPage((p) => p + 1)}
                                className="text-xs h-7 px-2.5"
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
