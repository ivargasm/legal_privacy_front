'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    ShieldCheck,
    X,
    Loader2,
    FileText,
    CheckSquare,
    Square,
    Plus,
    Trash2,
    ArrowRight,
    AlertCircle,
    Info,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PIIEntity } from '@/app/store/documentStore';
import { uploadSanitizedPrecedent, ReplacementItem } from '@/app/lib/documentApi';
import { toast } from 'sonner';

export interface SanitizePrecedentModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
    extractedText: string;
    entities: PIIEntity[];
    onSuccess: () => void;
    activeOrgName?: string;
    activeOrgId?: number | null;
}

interface PrecedentItem {
    id: string;
    text: string;
    placeholder: string;
    entity_type: string;
    occurrences: number;
    enabled: boolean;
    isCustom?: boolean;
}

function getEntityBadgeStyle(type: string) {
    const t = (type || '').toUpperCase();
    if (t.includes('PERSON')) {
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900';
    }
    if (t.includes('ORG')) {
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900';
    }
    if (t.includes('FISCAL') || t.includes('RFC')) {
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
    }
    if (t.includes('CURP')) {
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900';
    }
    if (t.includes('ADDRESS') || t.includes('DOMICILIO')) {
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900';
    }
    if (t.includes('PHONE') || t.includes('TELEFONO')) {
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900';
    }
    if (t.includes('BANK') || t.includes('CLABE')) {
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900';
    }
    if (t.includes('EXPEDIENTE') || t.includes('DEED') || t.includes('ESCRITURA')) {
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900';
    }
    return 'bg-muted text-muted-foreground border-border';
}

function getReadableEntityName(type: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('PERSON')) return 'Persona';
    if (t.includes('ORG')) return 'Organización / Empresa';
    if (t.includes('FISCAL') || t.includes('RFC')) return 'RFC';
    if (t.includes('CURP')) return 'CURP';
    if (t.includes('ADDRESS') || t.includes('DOMICILIO')) return 'Domicilio';
    if (t.includes('PHONE') || t.includes('TELEFONO')) return 'Teléfono';
    if (t.includes('EMAIL')) return 'Correo';
    if (t.includes('BANK') || t.includes('CLABE')) return 'Cuenta / CLABE';
    if (t.includes('NOTARIAL_DEED') || t.includes('ESCRITURA')) return 'Escritura Pública';
    if (t.includes('EXPEDIENTE')) return 'Expediente';
    return type || 'Dato';
}

export function SanitizePrecedentModal({
    isOpen,
    onClose,
    file,
    extractedText,
    entities,
    onSuccess,
    activeOrgName,
    activeOrgId,
}: SanitizePrecedentModalProps) {
    const [mounted, setMounted] = useState(false);
    const [title, setTitle] = useState('');
    const [items, setItems] = useState<PrecedentItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Formulario para agregar regla manual
    const [manualText, setManualText] = useState('');
    const [manualPlaceholder, setManualPlaceholder] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Inicializar items cuando se abre el modal con datos nuevos
    useEffect(() => {
        if (!isOpen) return;

        // Título por defecto: nombre del archivo sin extensión
        if (file) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').trim();
            setTitle(cleanName || 'Machote Institucional');
        } else {
            setTitle('Machote Institucional');
        }

        // Deduplicar entidades por texto normalizado
        const textOccurrences: Record<string, number> = {};
        const lowerText = extractedText.toLowerCase();

        const uniqueMap = new Map<string, { entity_type: string; originalText: string }>();

        for (const ent of entities) {
            const raw = ent.text?.trim();
            if (!raw || raw.length < 2) continue;

            const key = raw.toLowerCase();
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, { entity_type: ent.entity_type, originalText: raw });
            }
        }

        // Contar apariciones aproximadas
        uniqueMap.forEach((_, key) => {
            let count = 0;
            let pos = 0;
            while ((pos = lowerText.indexOf(key, pos)) !== -1) {
                count++;
                pos += key.length;
            }
            textOccurrences[key] = Math.max(count, 1);
        });

        // Contadores por tipo para auto-generar nombres secuenciales elegantes
        let personIndex = 1;
        let orgIndex = 1;

        const initialItems: PrecedentItem[] = [];

        uniqueMap.forEach((val, key) => {
            const t = (val.entity_type || '').toUpperCase();
            let defaultPlaceholder = `[${val.entity_type}]`;

            if (t.includes('PERSON')) {
                defaultPlaceholder = `[PARTE_${personIndex} - PERSONA]`;
                personIndex++;
            } else if (t.includes('ORG')) {
                defaultPlaceholder = `[EMPRESA_${orgIndex}]`;
                orgIndex++;
            } else if (t.includes('FISCAL') || t.includes('RFC')) {
                defaultPlaceholder = '[RFC]';
            } else if (t.includes('CURP')) {
                defaultPlaceholder = '[CURP]';
            } else if (t.includes('ADDRESS') || t.includes('DOMICILIO')) {
                defaultPlaceholder = '[DOMICILIO]';
            } else if (t.includes('PHONE') || t.includes('TELEFONO')) {
                defaultPlaceholder = '[TELEFONO]';
            } else if (t.includes('EMAIL')) {
                defaultPlaceholder = '[CORREO_ELECTRONICO]';
            } else if (t.includes('BANK') || t.includes('CLABE')) {
                defaultPlaceholder = '[CUENTA_BANCARIA]';
            } else if (t.includes('NOTARIAL_DEED') || t.includes('ESCRITURA')) {
                defaultPlaceholder = '[ESCRITURA_PUBLICA]';
            } else if (t.includes('EXPEDIENTE')) {
                defaultPlaceholder = '[NUMERO_EXPEDIENTE]';
            }

            initialItems.push({
                id: `ent-${key}`,
                text: val.originalText,
                placeholder: defaultPlaceholder,
                entity_type: val.entity_type,
                occurrences: textOccurrences[key] || 1,
                enabled: true,
            });
        });

        setItems(initialItems);
        setManualText('');
        setManualPlaceholder('');
    }, [isOpen, file, extractedText, entities]);

    // Cerrar con tecla Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    const activeCount = useMemo(() => items.filter((i) => i.enabled).length, [items]);

    const handleToggleAll = (enable: boolean) => {
        setItems((prev) => prev.map((item) => ({ ...item, enabled: enable })));
    };

    const handleToggleItem = (id: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
        );
    };

    const handlePlaceholderChange = (id: string, newPlaceholder: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, placeholder: newPlaceholder } : item))
        );
    };

    const handleAddManual = (e: React.FormEvent) => {
        e.preventDefault();
        const t = manualText.trim();
        let p = manualPlaceholder.trim();
        if (!t) {
            toast.error('Ingresa el texto confidencial a reemplazar.');
            return;
        }
        if (!p) {
            p = `[${t.toUpperCase().replace(/\s+/g, '_')}]`;
        }
        if (!p.startsWith('[')) p = `[${p}`;
        if (!p.endsWith(']')) p = `${p}]`;

        const newItem: PrecedentItem = {
            id: `manual-${Date.now()}`,
            text: t,
            placeholder: p,
            entity_type: 'MANUAL',
            occurrences: 1,
            enabled: true,
            isCustom: true,
        };

        setItems((prev) => [newItem, ...prev]);
        setManualText('');
        setManualPlaceholder('');
        toast.success(`Regla manual agregada para "${t}".`);
    };

    const handleRemoveItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Por favor asigna un título descriptivo al machote.');
            return;
        }

        const activeReplacements: ReplacementItem[] = items
            .filter((item) => item.enabled && item.placeholder.trim())
            .map((item) => ({
                text: item.text,
                placeholder: item.placeholder.trim(),
                entity_type: item.entity_type,
            }));

        setIsSubmitting(true);
        try {
            await uploadSanitizedPrecedent(
                {
                    title: title.trim(),
                    raw_text: extractedText,
                    replacements: activeReplacements,
                },
                activeOrgId
            );

            toast.success(
                `Machote "${title.trim()}" indexado exitosamente sin datos confidenciales.`
            );
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error al subir machote sanitizado:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error al indexar el machote en el acervo del despacho.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
                onClick={!isSubmitting ? onClose : undefined}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10">
                {/* Header */}
                <div className="px-6 py-4.5 border-b border-border flex items-center justify-between bg-card shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <span>Convertir en Machote Institucional</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono bg-primary/10 text-primary border-primary/20">
                                    Zero-Trust
                                </Badge>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Acervo Privado de{' '}
                                <strong className="text-foreground">{activeOrgName || 'tu Despacho'}</strong>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs text-foreground flex-1">
                    {/* Zero-Trust Notice */}
                    <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                            <strong className="text-foreground font-semibold">
                                Sanitización Previa a la Persistencia:
                            </strong>{' '}
                            Los nombres reales de tus clientes, razones sociales, RFCs y domicilios serán
                            sustituidos por marcadores estándar (ej.{' '}
                            <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">[ARRENDADOR]</code>,{' '}
                            <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">[DOMICILIO]</code>) en
                            memoria local antes de almacenarse en Postgres y antes de calcular embeddings vectoriales.
                            Ningún dato confidencial antiguo quedará registrado.
                        </div>
                    </div>

                    {/* Título del documento */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>Título del Machote o Precedente:</span>
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Contrato de Arrendamiento Inmobiliario (Machote 2026)"
                            className="text-xs h-9 bg-background border-border"
                            disabled={isSubmitting}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Este nombre identificará el documento dentro de la biblioteca de tu despacho.
                        </p>
                    </div>

                    {/* Barra de control de entidades detectadas */}
                    <div className="pt-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-xs">
                                    Datos Confidenciales Detectados
                                </span>
                                <Badge variant="secondary" className="text-[11px] px-2 py-0">
                                    {activeCount} de {items.length} activos
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleAll(true)}
                                    disabled={isSubmitting || items.length === 0}
                                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
                                >
                                    <CheckSquare className="w-3 h-3 mr-1" />
                                    Seleccionar todos
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleAll(false)}
                                    disabled={isSubmitting || items.length === 0}
                                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
                                >
                                    <Square className="w-3 h-3 mr-1" />
                                    Deseleccionar
                                </Button>
                            </div>
                        </div>

                        {/* Listado de Entidades */}
                        <div className="divide-y divide-border/60 max-h-64 overflow-y-auto mt-1 border border-border rounded-xl bg-card">
                            {items.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground">
                                    <Info className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                                    <p>No se detectaron datos personales o entidades confidenciales en el documento.</p>
                                    <p className="text-[11px] mt-1">Puedes agregar marcadores manuales abajo si lo deseas.</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 transition-colors ${
                                            item.enabled ? 'bg-card' : 'bg-muted/30 opacity-60'
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={item.enabled}
                                            onChange={() => handleToggleItem(item.id)}
                                            disabled={isSubmitting}
                                            className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer shrink-0"
                                        />

                                        {/* Original Value & Badge */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono font-medium text-foreground text-xs truncate max-w-[200px] sm:max-w-[240px]">
                                                    {item.text}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] py-0 px-1.5 font-normal border ${getEntityBadgeStyle(
                                                        item.entity_type
                                                    )}`}
                                                >
                                                    {getReadableEntityName(item.entity_type)}
                                                </Badge>
                                                {item.occurrences > 1 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        ({item.occurrences} veces)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />

                                        {/* Editable Placeholder Input */}
                                        <div className="w-full sm:w-56 shrink-0 flex items-center gap-1.5">
                                            <Input
                                                value={item.placeholder}
                                                onChange={(e) => handlePlaceholderChange(item.id, e.target.value)}
                                                placeholder="[MARCADOR_GENERICO]"
                                                disabled={!item.enabled || isSubmitting}
                                                className="text-xs h-8 font-mono bg-background border-border text-foreground"
                                            />
                                            {item.isCustom && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={isSubmitting}
                                                    className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                                                    title="Eliminar regla manual"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Agregar regla manual adicional */}
                    <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Plus className="w-3.5 h-3.5 text-primary" />
                            <span>Agregar regla de sustitución manual:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                                value={manualText}
                                onChange={(e) => setManualText(e.target.value)}
                                placeholder="Texto confidencial exacto (ej. Torre Diana Piso 18)"
                                className="text-xs h-8 bg-background border-border"
                                disabled={isSubmitting}
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    value={manualPlaceholder}
                                    onChange={(e) => setManualPlaceholder(e.target.value)}
                                    placeholder="Marcador (ej. [DOMICILIO_CORP])"
                                    className="text-xs h-8 font-mono bg-background border-border"
                                    disabled={isSubmitting}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddManual}
                                    disabled={isSubmitting || !manualText.trim()}
                                    className="h-8 text-xs shrink-0"
                                >
                                    Agregar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 bg-card shrink-0">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-primary" />
                        <span>Se aplicarán {activeCount} sustituciones antes del indexado.</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !title.trim()}
                            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shadow-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    <span>Sanitizando e indexando...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                    <span>Guardar e Indexar Machote</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
