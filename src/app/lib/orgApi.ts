import { API_URL } from "./documentApi";

export interface Organization {
    id: number;
    name: string;
    slug: string;
    tax_id?: string | null;
    owner_id: number;
    max_members: number;
    is_active: boolean;
    created_at: string;
    current_user_role?: string;
    current_user_membership_active?: boolean;
}

export interface Member {
    id: number;
    user_id: number;
    username: string;
    email: string;
    role: "owner" | "admin" | "lawyer" | "guest";
    is_active: boolean;
    joined_at: string;
}

export interface Invitation {
    id: number;
    organization_id: number;
    organization_name: string;
    email: string;
    role: "admin" | "lawyer" | "guest";
    status: "pending" | "accepted" | "expired" | "revoked";
    invited_by_name: string;
    expires_at: string;
    created_at: string;
}

export interface InvitationDetail {
    organization_id: number;
    organization_name: string;
    email: string;
    role: string;
    expires_at: string;
    is_user_registered: boolean;
}

function getOrgHeaders(activeOrgId?: number | null): HeadersInit {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (activeOrgId) {
        headers["X-Organization-Id"] = String(activeOrgId);
    }
    return headers;
}

export async function fetchMyOrganizations(): Promise<Organization[]> {
    const res = await fetch(`${API_URL}/api/v1/organizations/my`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Error al obtener despachos");
    return res.json();
}

export async function fetchActiveOrganization(activeOrgId?: number | null): Promise<Organization> {
    const res = await fetch(`${API_URL}/api/v1/organizations/active`, {
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
    });
    if (!res.ok) throw new Error("Error al consultar despacho activo");
    return res.json();
}

export async function createOrganization(data: { name: string; tax_id?: string }): Promise<Organization> {
    const res = await fetch(`${API_URL}/api/v1/organizations`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al crear despacho");
    }
    return res.json();
}

export async function updateOrganization(
    orgId: number,
    data: { name?: string; tax_id?: string }
): Promise<Organization> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}`, {
        method: "PUT",
        credentials: "include",
        headers: getOrgHeaders(orgId),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al actualizar despacho");
    }
    return res.json();
}

export async function fetchMembers(orgId: number): Promise<Member[]> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members`, {
        credentials: "include",
        headers: getOrgHeaders(orgId),
    });
    if (!res.ok) throw new Error("Error al listar miembros del despacho");
    return res.json();
}

export async function updateMemberRole(
    orgId: number,
    userId: number,
    role: "admin" | "lawyer" | "guest"
): Promise<Member> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members/${userId}/role`, {
        method: "PUT",
        credentials: "include",
        headers: getOrgHeaders(orgId),
        body: JSON.stringify({ role }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al actualizar rol de miembro");
    }
    return res.json();
}

export async function updateMemberStatus(
    orgId: number,
    userId: number,
    is_active: boolean
): Promise<Member> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members/${userId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: getOrgHeaders(orgId),
        body: JSON.stringify({ is_active }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al cambiar estado del miembro");
    }
    return res.json();
}

export async function removeMember(orgId: number, userId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getOrgHeaders(orgId),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al remover miembro");
    }
    return res.json();
}

export async function fetchPendingInvitations(orgId: number): Promise<Invitation[]> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/invitations`, {
        credentials: "include",
        headers: getOrgHeaders(orgId),
    });
    if (!res.ok) throw new Error("Error al listar invitaciones");
    return res.json();
}

export async function inviteMember(
    orgId: number,
    data: { email: string; role: "admin" | "lawyer" | "guest" }
): Promise<Invitation> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/invitations`, {
        method: "POST",
        credentials: "include",
        headers: getOrgHeaders(orgId),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al enviar invitación");
    }
    return res.json();
}

export async function revokeInvitation(orgId: number, invitationId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/invitations/${invitationId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getOrgHeaders(orgId),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al revocar invitación");
    }
    return res.json();
}

export async function getInvitationDetail(token: string): Promise<InvitationDetail> {
    const res = await fetch(`${API_URL}/api/v1/organizations/invitations/detail?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Invitación no válida o expirada");
    }
    return res.json();
}

export async function acceptInvitation(token: string): Promise<{
    message: string;
    organization_id: number;
    organization_name: string;
    role: string;
}> {
    const res = await fetch(`${API_URL}/api/v1/organizations/invitations/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error al aceptar la invitación");
    }
    return res.json();
}
