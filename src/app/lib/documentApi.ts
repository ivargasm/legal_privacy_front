import { PIIEntity } from '../store/documentStore';

export const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:8000';

export class ApiError extends Error {
    status?: number;
    isQuotaExceeded?: boolean;
    constructor(message: string, status?: number, isQuotaExceeded?: boolean) {
        super(message);
        this.status = status;
        this.isQuotaExceeded = isQuotaExceeded;
    }
}

async function throwHandledApiError(res: Response, fallbackMessage: string): Promise<never> {
    const errorData = await res.json().catch(() => null);
    const detail = typeof errorData?.detail === 'string' ? errorData.detail : null;

    if (res.status === 401) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            window.location.href = '/auth/login';
        }
        throw new ApiError(detail || 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 401);
    }
    if (res.status === 402) {
        throw new ApiError(
            detail || 'Has alcanzado el límite de documentos de tu plan. Actualiza tu suscripción para continuar.',
            402,
            true
        );
    }
    if (res.status === 403) {
        throw new Error(detail || 'No tienes permisos suficientes para realizar esta acción.');
    }
    if (res.status === 413) {
        throw new Error(detail || 'El archivo excede el tamaño máximo permitido (25 MB).');
    }
    if (res.status === 429) {
        throw new Error(
            detail || 'Demasiadas solicitudes seguidas. Espera unos segundos e inténtalo de nuevo.'
        );
    }

    throw new Error(detail || fallbackMessage);
}

export async function analyzeDocument(file: File, activeOrgId?: number | null) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const orgId = activeOrgId || (typeof window !== 'undefined' ? localStorage.getItem('active_org_id') : null);
    if (orgId) {
        headers['X-Organization-Id'] = String(orgId);
    }

    const res = await fetch(`${API_URL}/api/v1/documents/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al analizar el documento');
    }

    return res.json();
}

export interface PublicLawItem {
    id: number;
    title: string;
    source?: string | null;
    scope?: 'PUBLIC' | 'ORGANIZATION';
    organization_id?: number | null;
    created_at?: string | null;
    chunks_count: number;
    embedding_model: string;
    embedding_dim?: number | null;
    chunking_strategy?: string | null;
    is_structured?: boolean;
    fts_ready?: boolean;
    needs_reindex: boolean;
    can_manage?: boolean;
}

export interface PublicLawsResponse {
    embedding_model: string;
    is_local: boolean;
    provider: string;
    ollama_pull_model?: string | null;
    chunking_strategy_active?: string;
    can_manage?: boolean;
    can_manage_public?: boolean;
    can_manage_firm?: boolean;
    current_org_id?: number;
    current_org_name?: string;
    current_user_role?: string;
    laws: PublicLawItem[];
    outdated_count: number;
}

export async function getPublicLaws(scope?: 'PUBLIC' | 'ORGANIZATION' | 'ALL'): Promise<PublicLawsResponse> {
    const url = new URL(`${API_URL}/api/v1/library/laws`);
    if (scope) {
        url.searchParams.set('scope', scope);
    }
    const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al consultar las leyes indexadas');
    }

    return res.json();
}

export async function reindexPublicLaws(documentId?: number) {
    const res = await fetch(`${API_URL}/api/v1/library/reindex`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentId !== undefined ? { document_id: documentId } : {}),
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al re-indexar leyes públicas');
    }

    return res.json();
}

export async function uploadPublicLaw(file: File, scope: 'PUBLIC' | 'ORGANIZATION' = 'PUBLIC') {
    const formData = new FormData();
    formData.append('file', file);

    const url = new URL(`${API_URL}/api/v1/library/upload_law`);
    url.searchParams.set('scope', scope);

    const res = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al subir el documento a la biblioteca');
    }

    return res.json();
}

export async function deletePublicLaw(documentId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/v1/library/laws/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al eliminar documento del acervo');
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
        await throwHandledApiError(res, 'Error al anonimizar el documento');
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
        await throwHandledApiError(res, 'Error al añadir a excepciones');
    }

    return res.json();
}

export async function getBlacklist() {
    const res = await fetch(`${API_URL}/api/v1/documents/blacklist`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al obtener la lista de excepciones');
    }

    return res.json();
}

export async function deleteFromBlacklist(entityId: number) {
    const res = await fetch(`${API_URL}/api/v1/documents/blacklist/${entityId}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al eliminar de excepciones');
    }

    return res.json();
}

export interface RepresentableParty {
    token: string;
    role: string;
    display_label: string;
    entity_type: string;
}

export type AdvisoryMode = 'qa' | 'review' | 'draft' | 'compliance';

export interface MaskDocumentResponse {
    masked_text: string;
    session_id: string;
    parties?: RepresentableParty[];
}

export async function maskDocument(text: string, entities: PIIEntity[]): Promise<MaskDocumentResponse> {
    const res = await fetch(`${API_URL}/api/v1/documents/mask`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, entities }),
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al enmascarar el documento');
    }

    return res.json();
}

export interface ChatDocumentResponse {
    reply: string;
    masked_user_message?: string;
    raw_masked_reply?: string;
    effective_mode?: AdvisoryMode;
}

export async function chatDocument(
    sessionId: string,
    message: string,
    options?: {
        advisoryMode?: AdvisoryMode;
        clientPartyToken?: string | null;
    }
): Promise<ChatDocumentResponse> {
    const res = await fetch(`${API_URL}/api/v1/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            message,
            advisory_mode: options?.advisoryMode ?? null,
            client_party_token: options?.clientPartyToken || null,
        }),
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error en el chat');
    }

    return res.json();
}

export async function exportAdvisoryDocx(params: {
    title: string;
    content: string;
    sourceFilename?: string;
    partyLabel?: string;
}): Promise<Blob> {
    const res = await fetch(`${API_URL}/api/v1/documents/export-advisory`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: params.title,
            content: params.content,
            source_filename: params.sourceFilename || null,
            party_label: params.partyLabel || null,
        }),
    });

    if (!res.ok) {
        await throwHandledApiError(res, 'Error al exportar el dictamen en Word (.docx)');
    }

    return res.blob();
}
