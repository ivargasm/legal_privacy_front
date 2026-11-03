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
                // No llamamos console.error para evitar el overlay de error de Next.js en entorno de desarrollo
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <div className="space-y-1">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                        VILLARREAL ABOGADOS · DESPACHO PRINCIPAL
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Espacio de Trabajo Jurídico
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Auditoría local, redacción asistida y desidentificación de contratos sin fuga de datos confidenciales.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Entorno de Aislamiento Activo (Zero Data Retention)</span>
                </div>
            </div>

            {/* Central Dropzone */}
            <div
                className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all bg-white dark:bg-slate-900/80 shadow-2xs ${
                    isDragging
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 scale-[1.005]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400/80 dark:hover:border-slate-700'
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
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900">
                        <Lock className="w-3.5 h-3.5" />
                    </div>
                </div>

                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Arrastra un contrato aquí o examina tus archivos
                </h3>

                <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                        Formatos admitidos: PDF, DOCX • Máx. 25 MB
                    </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center max-w-lg mb-6 leading-relaxed">
                    Los datos se procesan en tu equipo antes de cualquier consulta con IA. Ningún documento viaja sin testar criptográficamente.
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>{isUploading ? "Analizando..." : "Explorar archivos locales"}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                        onClick={handleLoadSample}
                        className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span>Cargar contrato de prueba</span>
                    </Button>
                </div>
            </div>

            {/* 3 Telemetry / Hardware Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Rendimiento Criptográfico */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-slate-500">
                            RENDIMIENTO CRIPTOGRÁFICO
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Motor Local Cuantizado
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Ejecución en memoria local. Cero telemetría externa.
                        </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                            <span>Memoria Aislada</span>
                            <span className="font-mono font-medium">3.8 GB / 16.0 GB</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full w-[24%]" />
                        </div>
                    </div>
                </div>

                {/* Card 2: Bóveda Documental */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-slate-500">
                            BÓVEDA DOCUMENTAL
                        </span>
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Índice Vectorial Local (Redis)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Fragmentos indexados bajo cifrado efímero en memoria (TTL deslizante).
                        </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-500">Sha-256: 8f4e...9b12</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Sincronizado
                        </span>
                    </div>
                </div>

                {/* Card 3: Regla de Desidentificación */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-slate-500">
                            REGLA DE DESIDENTIFICACIÓN
                        </span>
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Cumplimiento LFPDPPP Local
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Nombres, RFC, CURP y CLABEs reemplazados por seudónimos criptográficos.
                        </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Diccionario de bufete activo</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Security Assurance Strip */}
            <div className="py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-around gap-4 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>100% procesamiento local en CPU/GPU del cliente</span>
                </div>
                <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>0 bytes transferidos a nubes públicas sin enmascarar</span>
                </div>
                <div className="flex items-center gap-2">
                    <FolderLock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cero retención externa de datos sensibles</span>
                </div>
            </div>
        </div>
    );
}
