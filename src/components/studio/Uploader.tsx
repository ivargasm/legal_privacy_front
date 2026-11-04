'use client';

import { useState, useRef } from 'react';
import {
    FileText,
    Shield,
    Lock,
    Database,
    ShieldCheck,
    CheckCircle2,
    Sparkles,
    FolderLock,
    UploadCloud,
    SlidersHorizontal,
    Cpu,
} from 'lucide-react';
import { useDocumentStore } from '@/app/store/documentStore';
import { analyzeDocument, ApiError } from '@/app/lib/documentApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Uploader() {
    const [isDragging, setIsDragging] = useState(false);
    const { setFile, setAnalysisResult, setError, setQuotaExceeded } = useDocumentStore();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
            toast.error("Formato no soportado. Sube un PDF (.pdf) o Word (.docx).");
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast.error("El archivo supera el tamaño máximo permitido de 25 MB.");
            return;
        }

        setFile(file);
        setIsUploading(true);
        toast.info("Iniciando análisis y detección de datos personales...");

        try {
            const data = await analyzeDocument(file);
            setAnalysisResult(data.extracted_text, data.entities);
            toast.success("Documento analizado con éxito.");
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error al procesar el archivo.";

            // Compuerta de cuota / límite de plan de facturación
            const isQuota =
                (error instanceof ApiError && (error.status === 402 || error.isQuotaExceeded)) ||
                msg.toLowerCase().includes('límite') ||
                msg.toLowerCase().includes('plan gratuito') ||
                msg.toLowerCase().includes('cuota');

            if (isQuota) {
                setQuotaExceeded(true, msg);
            } else {
                console.error("Error al procesar el archivo:", error);
                setError(msg);
                toast.error(msg);
            }
        } finally {
            setIsUploading(false);
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

    const handleLoadSample = async () => {
        setIsUploading(true);
        toast.info("Cargando contrato de prueba...");
        try {
            const response = await fetch('/contrato_muestra.pdf');
            if (!response.ok) {
                throw new Error("No se pudo cargar el archivo de prueba desde /contrato_muestra.pdf");
            }
            const blob = await response.blob();
            const sampleFile = new File([blob], 'Contrato_Arrendamiento_Muestra.pdf', { type: 'application/pdf' });
            await handleFile(sampleFile);
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : "Error al cargar contrato de prueba.";
            toast.error(msg);
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header / Workspace Identity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div className="space-y-1">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                        SISTEMA FORENSE DE PRIVACIDAD · DESPACHO JURÍDICO
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Espacio de Trabajo Jurídico
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Auditoría local, redacción asistida y desidentificación de contratos sin fuga de datos confidenciales.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Entorno de Aislamiento Activo (Zero Data Retention)</span>
                </div>
            </div>

            {/* Central Dropzone */}
            <div
                className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border-2 border-dashed transition-all bg-card shadow-sm ${
                    isDragging
                        ? 'border-primary bg-accent/20 scale-[1.005]'
                        : 'border-border hover:border-primary/60 hover:shadow-md'
                }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
            >
                {/* Central Document + Padlock Icon */}
                <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-xl bg-muted text-primary flex items-center justify-center border border-border shadow-xs">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs ring-2 ring-card">
                        <Lock className="w-3.5 h-3.5" />
                    </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
                    Arrastra un contrato aquí o examina tus archivos
                </h3>

                <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground bg-muted border border-border">
                        Formatos admitidos: PDF, DOCX • Máx. 25 MB
                    </span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-lg mb-6 leading-relaxed">
                    Los datos se procesan en tu servidor antes de cualquier consulta con IA. Ningún documento viaja a modelos externos sin testar criptográficamente.
                </p>

                <input
                    ref={fileInputRef}
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.docx"
                    onChange={onChange}
                    disabled={isUploading}
                />

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>{isUploading ? "Analizando..." : "Explorar archivos locales"}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                        onClick={handleLoadSample}
                        className="border-border text-foreground hover:bg-muted font-medium px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Sparkles className="w-4 h-4 text-accent-foreground" />
                        <span>Cargar contrato de prueba</span>
                    </Button>
                </div>
            </div>

            {/* 3 Telemetry / Hardware Status Cards (LexControl StatsCard Style) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Rendimiento Criptográfico */}
                <div className="p-5 rounded-xl bg-card border border-border space-y-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-muted-foreground">
                            RENDIMIENTO CRIPTOGRÁFICO
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-muted text-primary shrink-0">
                            <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                Motor Local Cuantizado
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Detección de PII y filtro de falsos positivos ejecutado 100% en local.
                            </p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                            <span>Memoria Aislada</span>
                            <span className="font-mono font-medium text-foreground">Qwen 2.5:7b + Presidio</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full w-[35%]" />
                        </div>
                    </div>
                </div>

                {/* Card 2: Bóveda Documental */}
                <div className="p-5 rounded-xl bg-card border border-border space-y-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-muted-foreground">
                            BÓVEDA EFÍMERA
                        </span>
                        <Database className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-muted text-primary shrink-0">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                Índice Vectorial (Redis)
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Fragmentos protegidos bajo cifrado efímero en memoria (TTL deslizante de 2h).
                            </p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                        <span className="font-mono text-muted-foreground">Zero Data Retention</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Sincronizado
                        </span>
                    </div>
                </div>

                {/* Card 3: Regla de Desidentificación */}
                <div className="p-5 rounded-xl bg-card border border-border space-y-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-muted-foreground">
                            DESIDENTIFICACIÓN LFPDPPP
                        </span>
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-muted text-accent-foreground shrink-0">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                Seudónimos Criptográficos
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Nombres, RFC, CURP y CLABEs reemplazados por tokens reversibles en local.
                            </p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent-foreground">
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Diccionario de despacho activo</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Security Assurance Strip */}
            <div className="py-3 px-4 rounded-xl bg-card border border-border flex flex-wrap items-center justify-around gap-4 text-xs text-muted-foreground font-medium shadow-xs">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>100% procesamiento local en servidor del despacho</span>
                </div>
                <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>0 bytes transferidos a nubes públicas sin enmascarar</span>
                </div>
                <div className="flex items-center gap-2">
                    <FolderLock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Cero retención persistente de contratos crudos</span>
                </div>
            </div>
        </div>
    );
}
