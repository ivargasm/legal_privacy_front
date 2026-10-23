/**
 * Formatea una cadena de fecha UTC (ISO 8601) a la hora local del usuario.
 * @param dateString Cadena de fecha en formato UTC (ej. "2026-07-16T18:00:00Z" o sin Z si el backend lo omite pero es UTC)
 * @returns Fecha formateada en la zona horaria local (ej. "16 jul 2026, 12:00 PM")
 */
export function formatDateToLocal(dateString: string | undefined | null): string {
    if (!dateString) return "Fecha no disponible";
    
    try {
        let safeDateString = dateString;
        
        // Reemplazar espacio por 'T' si viene en formato SQL crudo (ej. "2026-07-16 12:00:00")
        if (!safeDateString.includes('T')) {
            safeDateString = safeDateString.replace(' ', 'T');
        }
        
        // Si no termina en 'Z' y no tiene un offset (ej. +00:00 o -06:00), asumimos que es UTC y agregamos 'Z'
        if (!safeDateString.endsWith('Z') && !safeDateString.match(/[+-]\d{2}:\d{2}$/)) {
            safeDateString += 'Z';
        }
        
        const date = new Date(safeDateString);
        
        // Validar si la fecha pudo ser parseada correctamente
        if (isNaN(date.getTime())) {
            console.error("String de fecha no pudo ser parseado:", dateString);
            return "Fecha inválida";
        }
        
        // Usamos Intl.DateTimeFormat para un formato amigable basado en la configuración local del navegador
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    } catch (error) {
        console.error("Error formateando la fecha:", error);
        return "Fecha inválida";
    }
}
