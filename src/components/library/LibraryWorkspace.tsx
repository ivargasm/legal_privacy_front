'use client';

import { useState } from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { uploadPublicLaw } from '@/app/lib/documentApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LibraryWorkspace() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lastUpload, setLastUpload] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
            toast.error("Formato no soportado. Sube un PDF o DOCX.");
            return;
        }

        setIsUploading(true);
        setLastUpload(null);
        toast.info("Indexando ley en pgvector... (esto puede tardar unos segundos)");

        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const data = await uploadPublicLaw(file);
            toast.success(`Ley "${file.name}" subida exitosamente.`);
            setLastUpload(file.name);
        } catch (error) {
            console.error(error);
            toast.error((error as { message: string }).message || "Error al subir la ley.");
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

    return (
        <div className={`flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-12 border-2 border-dashed rounded-xl transition-colors bg-card ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
        >
            <BookOpen className="w-16 h-16 text-indigo-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-2 text-center">Subir Ley o Reglamento</h3>
            <p className="text-sm text-muted-foreground mb-8 text-center">
                Arrastra un archivo PDF o DOCX aquí. Este documento NO pasará por el motor de anonimización.
            </p>

            <input
                type="file"
                id="library-upload"
                className="hidden"
                accept=".pdf,.docx"
                onChange={onChange}
                disabled={isUploading}
            />

            {isUploading ? (
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="text-indigo-600 font-medium">Extrayendo texto y generando vectores...</p>
                </div>
            ) : (
                <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                    <label htmlFor="library-upload" className="cursor-pointer">
                        Seleccionar Archivo Público
                    </label>
                </Button>
            )}

            {lastUpload && !isUploading && (
                <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-3 w-full">
                    <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                    <div>
                        <p className="font-medium text-emerald-900 dark:text-emerald-400">Indexación Completada</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-500">{lastUpload} ahora está disponible en el Cerebro Público.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
