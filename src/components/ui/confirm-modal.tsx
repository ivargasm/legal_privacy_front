'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, Loader2, X } from 'lucide-react';
import { Button } from './button';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'warning' | 'primary';
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'destructive',
    isLoading = false,
}: ConfirmModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Cerrar con Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    if (!mounted || !isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'destructive':
                return (
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/60">
                        <Trash2 className="w-5 h-5" />
                    </div>
                );
            case 'warning':
                return (
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/60">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                );
            case 'primary':
            default:
                return (
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                        <Info className="w-5 h-5" />
                    </div>
                );
        }
    };

    const getConfirmButtonClasses = () => {
        switch (variant) {
            case 'destructive':
                return 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs';
            case 'warning':
                return 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs';
            case 'primary':
            default:
                return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            {/* Backdrop click */}
            <div
                className="fixed inset-0"
                onClick={() => {
                    if (!isLoading) onClose();
                }}
            />

            {/* Modal Dialog */}
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 z-10 animate-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        {getIcon()}
                        <div>
                            <h3 className="font-semibold text-base text-slate-900 dark:text-white leading-snug">
                                {title}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                {description}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Cerrar modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={onClose}
                        className="text-xs h-8 rounded-lg"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={isLoading}
                        onClick={onConfirm}
                        className={`text-xs h-8 rounded-lg ${getConfirmButtonClasses()}`}
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
