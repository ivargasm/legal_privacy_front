'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentStore } from '@/app/store/documentStore';
import { FileText, Loader2, Shield } from 'lucide-react';

export default function WorkspaceSkeleton() {
    const { file } = useDocumentStore();

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] dark:bg-slate-950 relative overflow-hidden -m-4 sm:-m-6">
            {/* Top Bar Skeleton */}
            <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-24" />
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[300px]">
                            {file?.name || 'Analizando documento...'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-28 rounded-lg" />
                    <Skeleton className="h-8 w-32 rounded-lg" />
                </div>
            </div>

            {/* Sub-barra Skeleton */}
            <div className="px-6 py-1.5 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Ejecutando Microsoft Presidio + SpaCy + Ollama localmente...</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Aislamiento 100% en memoria</span>
                </div>
            </div>

            {/* Main Canvas + Sidebar Skeleton */}
            <div className="flex-1 flex overflow-hidden">
                {/* Paper Canvas Skeleton */}
                <div className="flex-1 p-6 sm:p-10 overflow-hidden flex flex-col items-center">
                    <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-sm p-10 sm:p-14 space-y-4">
                        <Skeleton className="h-7 w-2/3 mb-6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[92%]" />
                        <Skeleton className="h-4 w-[96%]" />
                        <Skeleton className="h-4 w-[85%]" />
                        <div className="py-4 space-y-3">
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[90%]" />
                            <Skeleton className="h-4 w-[94%]" />
                        </div>
                        <div className="py-4 space-y-3">
                            <Skeleton className="h-5 w-2/5" />
                            <Skeleton className="h-4 w-[88%]" />
                            <Skeleton className="h-4 w-[92%]" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                </div>

                {/* Sidebar Skeleton */}
                <div className="w-80 sm:w-96 border-l border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shrink-0 hidden md:block">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <div className="space-y-3 pt-2">
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}
