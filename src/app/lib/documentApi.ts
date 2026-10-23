import { PIIEntity } from '../store/documentStore';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function analyzeDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/v1/documents/analyze`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al analizar el documento');
    }

    return res.json();
}

export async function uploadPublicLaw(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/v1/library/upload_law`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al subir la ley');
    }

    return res.json();
}

export async function redactDocument(file: File, entities: PIIEntity[]) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entities_json', JSON.stringify(entities));

    const res = await fetch(`${API_URL}/api/v1/documents/redact`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al anonimizar el documento');
    }

    return res.blob();
}

export async function blacklistEntity(text: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/blacklist`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al añadir a excepciones');
    }

    return res.json();
}

export async function getBlacklist() {
    const res = await fetch(`${API_URL}/api/v1/documents/blacklist`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al obtener la lista de excepciones');
    }

    return res.json();
}

export async function deleteFromBlacklist(entityId: number) {
    const res = await fetch(`${API_URL}/api/v1/documents/blacklist/${entityId}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al eliminar de excepciones');
    }

    return res.json();
}

export async function maskDocument(text: string, entities: PIIEntity[]) {
    const res = await fetch(`${API_URL}/api/v1/documents/mask`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, entities }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al enmascarar el documento');
    }

    return res.json(); // { masked_text, session_id }
}

export async function chatDocument(sessionId: string, message: string) {
    const res = await fetch(`${API_URL}/api/v1/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId, message }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error en el chat');
    }

    return res.json(); // { reply }
}
