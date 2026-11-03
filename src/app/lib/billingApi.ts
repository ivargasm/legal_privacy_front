import { API_URL } from "./documentApi";

export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export interface BillingPlan {
    tier: PlanTier;
    name: string;
    price_mxn: number;
    period: string;
    document_limit: number;
    max_members: number;
    description: string;
    features: string[];
    is_popular: boolean;
}

export interface BillingStatus {
    organization_id: number;
    organization_name: string;
    plan_tier: PlanTier;
    status: string;
    billing_period: string;
    documents_analyzed: number;
    document_limit: number;
    documents_remaining: number;
    current_period_start?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end: boolean;
    members_count: number;
    max_members: number;
    can_manage_billing: boolean;
    stripe_customer_id?: string | null;
    has_active_subscription: boolean;
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

export async function fetchBillingStatus(activeOrgId?: number | null): Promise<BillingStatus> {
    const res = await fetch(`${API_URL}/api/v1/billing/status`, {
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al obtener estado de facturación");
    }
    return res.json();
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
    const res = await fetch(`${API_URL}/api/v1/billing/plans`, {
        credentials: "include",
    });
    if (!res.ok) {
        throw new Error("Error al consultar planes disponibles");
    }
    return res.json();
}

export async function createCheckoutSession(
    plan_tier: "starter" | "pro",
    activeOrgId?: number | null
): Promise<string> {
    const res = await fetch(`${API_URL}/api/v1/billing/checkout-session`, {
        method: "POST",
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
        body: JSON.stringify({ plan_tier }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al iniciar proceso de suscripción");
    }
    const data = await res.json();
    return data.checkout_url;
}

export async function createCustomerPortalSession(activeOrgId?: number | null): Promise<string> {
    const res = await fetch(`${API_URL}/api/v1/billing/customer-portal`, {
        method: "POST",
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al acceder al portal de facturación");
    }
    const data = await res.json();
    return data.portal_url;
}

export async function changeSubscriptionPlan(
    new_plan_tier: "starter" | "pro",
    activeOrgId?: number | null
): Promise<BillingStatus> {
    const res = await fetch(`${API_URL}/api/v1/billing/change-plan`, {
        method: "POST",
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
        body: JSON.stringify({ new_plan_tier }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al cambiar de plan");
    }
    return res.json();
}

export async function cancelSubscription(
    activeOrgId?: number | null
): Promise<{ message: string; cancel_at_period_end: boolean; current_period_end?: string | null }> {
    const res = await fetch(`${API_URL}/api/v1/billing/cancel`, {
        method: "POST",
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al cancelar la suscripción");
    }
    return res.json();
}

export async function reactivateSubscription(
    activeOrgId?: number | null
): Promise<BillingStatus> {
    const res = await fetch(`${API_URL}/api/v1/billing/reactivate`, {
        method: "POST",
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al reactivar la suscripción");
    }
    return res.json();
}

export async function simulatePlanUpgrade(
    plan_tier: "starter" | "pro",
    activeOrgId?: number | null
): Promise<BillingStatus> {
    const res = await fetch(`${API_URL}/api/v1/billing/simulate-upgrade`, {
        method: "POST",
        credentials: "include",
        headers: getOrgHeaders(activeOrgId),
        body: JSON.stringify({ plan_tier }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al simular actualización de plan");
    }
    return res.json();
}
