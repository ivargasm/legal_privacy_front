'use client';

import ProtectedRoute from '../components/ProtectedRoutes';
import LibraryWorkspace from '@/components/library/LibraryWorkspace';

export default function LibraryPage() {
    return (
        <ProtectedRoute>
            <div className="w-full min-h-[calc(100vh-3.75rem)] mt-15 py-8 px-4 sm:px-6 bg-[#FAFAFA] dark:bg-slate-950 pb-16">
                <div className="max-w-5xl mx-auto mb-8 text-center space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                        ACERVO NORMATIVO Y DOCTRINA INTERNA
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Biblioteca Jurídica y Precedentes
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Leyes federales públicas (SCJN) y acervo confidencial de tu despacho. Indexación local por artículos y tesis (RRF) para fundamentación cruzada y auditoría contractual sin fuga de datos.
                    </p>
                </div>
                <div className="max-w-5xl mx-auto flex flex-col items-center">
                    <LibraryWorkspace />
                </div>
            </div>
        </ProtectedRoute>
    );
}
