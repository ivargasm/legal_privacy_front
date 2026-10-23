"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../store/Store";
import { Button } from "@/components/ui/button";

export default function SessionWatcher() {
    const { userAuth, user, renewSession, logout } = useAuthStore();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!userAuth || !user || !user.exp) {
            setShowWarning(false);
            return;
        }

        const checkExpiration = () => {
            const now = Math.floor(Date.now() / 1000); // en segundos
            const exp = user.exp as number;
            const remaining = exp - now;

            // Mostrar la advertencia si quedan 60 segundos o menos (1 minuto para pruebas)
            if (remaining <= 60 && remaining > 0) {
                setShowWarning(true);
                setTimeLeft(remaining);
            } else if (remaining <= 0) {
                // El token ya expiró o el tiempo se acabó
                logout();
                setShowWarning(false);
            } else {
                // Todo está bien, ocultamos si estaba visible por error
                setShowWarning(false);
            }
        };

        // Checar cada segundo
        const interval = setInterval(checkExpiration, 1000);
        
        // Ejecutar inmediatamente al montar
        checkExpiration();

        return () => clearInterval(interval);
    }, [userAuth, user, logout]);

    const handleRenew = async () => {
        await renewSession();
        setShowWarning(false); // Ocultar después de renovar
    };

    if (!showWarning) return null;

    // Formatear segundos a MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Tu sesión está por expirar
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Por tu seguridad, cerraremos tu sesión en:
                </p>
                <div className="text-4xl font-mono font-bold text-red-500 mb-6">
                    {formatTime(timeLeft)}
                </div>
                <div className="flex gap-4 justify-center">
                    <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => logout()}
                    >
                        Cerrar sesión
                    </Button>
                    <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleRenew}
                    >
                        Renovar
                    </Button>
                </div>
            </div>
        </div>
    );
}
