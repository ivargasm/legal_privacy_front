'use client';

import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useDocumentStore } from '@/app/store/documentStore';
import { analyzeDocument } from '@/app/lib/documentApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Uploader() {
    const [isDragging, setIsDragging] = useState(false);
    const { setFile, setAnalysisResult, setError } = useDocumentStore();
    const [isUploading, setIsUploading] = useState(false);

    const handleFile = async (file: File) => {
        if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
            toast.error("Formato no soportado. Sube un PDF o DOCX.");
            return;
        }

        setFile(file);
        setIsUploading(true);
        toast.info("Analizando documento...");

        try {
            const data = await analyzeDocument(file);
            setAnalysisResult(data.extracted_text, data.entities);
            toast.success("Documento analizado con éxito.");
        } catch (error: any) {
            console.error(error);
            setError(error.message);
            toast.error(error.message || "Error al procesar el archivo.");
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
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-[400px] border-2 border-dashed rounded-xl transition-colors bg-card
            ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
        >
            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sube tu documento</h3>
            <p className="text-sm text-muted-foreground mb-6">Arrastra y suelta un archivo PDF o DOCX aquí</p>
            
            <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".pdf,.docx" 
                onChange={onChange}
                disabled={isUploading}
            />
            <Button asChild disabled={isUploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                    {isUploading ? "Analizando..." : "Seleccionar Archivo"}
                </label>
            </Button>
        </div>
    );
}
