'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap, ArrowRight, X } from 'lucide-react';
import { useDocumentStore } from '@/app/store/documentStore';
import { Button } from '@/components/ui/button';

export default function QuotaExceededModal() {
    const router = useRouter();
    const { isQuotaExceeded, quotaErrorMsg, setQuotaExceeded } = useDocumentStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Cerrar con Escape
    useEffect(() => {
        if (!isQuotaExceeded) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setQuotaExceeded(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isQuotaExceeded, setQuotaExceeded]);

    if (!mounted || !isQuotaExceeded) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Click fuera para cerrar */}
            <div
                className="fixed inset-0"
                onClick={() => setQuotaExceeded(false)}
            />

            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                Límite de Documentos Alcanzado
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Cuota de análisis completada
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setQuotaExceeded(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Cerrar modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {quotaErrorMsg ||
                        "Has consumido los 3 documentos de tu Plan Gratuito de cortesía. Actualiza a Starter ($499 MXN) para 50 documentos o Despacho Pro ($1,899 MXN) para sumar a tu equipo y desbloquear tu acervo privado."}
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>
                            <strong>Starter ($499 MXN/mes):</strong> 50 contratos al mes y facturación a tu RFC.
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>
                            <strong>Despacho Pro ($1,899 MXN/mes):</strong> 250 contratos, hasta 5 abogados y acervo interno.
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuotaExceeded(false)}
                        className="text-xs"
                    >
                        Cerrar
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            setQuotaExceeded(false);
                            router.push('/organization?tab=billing');
                        }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                    >
                        <span>Ver Planes y Actualizar</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
