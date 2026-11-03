"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/Store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

export default function SessionWatcher() {
    const { userAuth, user, renewSession, logout } = useAuthStore();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRenewing, setIsRenewing] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isExpiratingRef = useRef(false);

    useEffect(() => {
        if (!userAuth || !user || !user.exp) {
            setShowWarning(false);
            return;
        }

        const checkExpiration = () => {
            const now = Math.floor(Date.now() / 1000);
            const exp = user.exp as number;
            const remaining = exp - now;

            // Mostrar la advertencia si quedan 60 segundos o menos
            if (remaining <= 60 && remaining > 0) {
                setShowWarning(true);
                setTimeLeft(remaining);
            } else if (remaining <= 0) {
                setTimeLeft(0);
                if (!isExpiratingRef.current) {
                    isExpiratingRef.current = true;
                    setShowWarning(false);
                    logout();
                }
            } else {
                setShowWarning(false);
            }
        };

        const interval = setInterval(checkExpiration, 1000);
        checkExpiration();

        return () => clearInterval(interval);
    }, [userAuth, user, logout]);

    const handleRenew = async () => {
        setIsRenewing(true);
        try {
            const success = await renewSession();
            if (success) {
                setShowWarning(false);
                toast.success("Sesión renovada exitosamente");
            } else {
                toast.error("No se pudo renovar la sesión");
            }
        } catch (error) {
            console.error("Error al renovar la sesión:", error);
            toast.error("Error al renovar la sesión");
        } finally {
            setIsRenewing(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setShowWarning(false);
        await logout();
    };

    if (!showWarning) return null;

    // Formatear segundos a MM:SS asegurando no mostrar números negativos
    const formatTime = (seconds: number) => {
        const safeSeconds = Math.max(0, seconds);
        const m = Math.floor(safeSeconds / 60);
        const s = safeSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-auto text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Tu sesión está por expirar
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Por seguridad jurídica y confidencialidad, la sesión se cerrará en:
                    </p>
                </div>
                <div className="text-4xl font-mono font-extrabold text-red-500 tracking-wider">
                    {formatTime(timeLeft)}
                </div>
                <div className="flex gap-3 pt-2">
                    <Button 
                        variant="outline" 
                        className="flex-1 rounded-xl text-xs font-semibold h-10 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={handleLogout}
                        disabled={isLoggingOut || isRenewing}
                    >
                        {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                        Cerrar sesión
                    </Button>
                    <Button 
                        className="flex-1 rounded-xl text-xs font-semibold h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        onClick={handleRenew}
                        disabled={isRenewing || isLoggingOut}
                    >
                        {isRenewing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                        Renovar
                    </Button>
                </div>
            </div>
        </div>
    );
}
