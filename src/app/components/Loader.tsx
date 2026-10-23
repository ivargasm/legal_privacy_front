"use client";

import { Loader2 } from "lucide-react";

export default function Loader() {
    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                Cargando...
            </p>
        </div>
    );
}
