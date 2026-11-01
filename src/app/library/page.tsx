'use client';

import ProtectedRoute from '../components/ProtectedRoutes';
import LibraryWorkspace from '@/components/library/LibraryWorkspace';

export default function LibraryPage() {
    return (
        <ProtectedRoute>
            <div className="container mx-auto py-8 px-4 min-h-screen pb-16 mt-20">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Biblioteca Pública Legal</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Sube leyes, reglamentos o jurisprudencias públicas. Estos documentos se guardarán permanentemente en PostgreSQL y servirán como referencia cruzada para la IA al analizar los contratos privados de los usuarios.
                    </p>
                </div>
                <div className="flex flex-col items-center">
                    <LibraryWorkspace />
                </div>
            </div>
        </ProtectedRoute>
    );
}
