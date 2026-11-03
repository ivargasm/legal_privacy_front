import { create } from "zustand";
import { Organization, fetchMyOrganizations, createOrganization } from "../lib/orgApi";

interface OrgState {
    organizations: Organization[];
    activeOrg: Organization | null;
    isLoading: boolean;
    loadOrganizations: () => Promise<Organization[]>;
    setActiveOrg: (org: Organization) => void;
    switchActiveOrg: (orgId: number) => void;
    createNewOrg: (name: string, tax_id?: string) => Promise<Organization>;
}

function saveActiveOrgCookie(orgId: number) {
    if (typeof document !== "undefined") {
        document.cookie = `active_org_id=${orgId}; Path=/; SameSite=Lax; Max-Age=31536000`;
        localStorage.setItem("active_org_id", String(orgId));
    }
}

function getStoredActiveOrgId(): number | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("active_org_id");
    if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) return parsed;
    }
    return null;
}

export const useOrgStore = create<OrgState>((set, get) => ({
    organizations: [],
    activeOrg: null,
    isLoading: false,

    loadOrganizations: async () => {
        set({ isLoading: true });
        try {
            const orgs = await fetchMyOrganizations();
            const storedId = getStoredActiveOrgId();

            let targetOrg = orgs.find((o) => o.id === storedId && o.current_user_membership_active !== false);
            if (!targetOrg) {
                targetOrg = orgs.find((o) => o.current_user_membership_active !== false) || orgs[0] || null;
            }

            if (targetOrg) {
                saveActiveOrgCookie(targetOrg.id);
            }

            set({
                organizations: orgs,
                activeOrg: targetOrg,
                isLoading: false,
            });
            return orgs;
        } catch (error) {
            console.error("Error cargando despachos:", error);
            set({ isLoading: false });
            return [];
        }
    },

    setActiveOrg: (org: Organization) => {
        saveActiveOrgCookie(org.id);
        set({ activeOrg: org });
    },

    switchActiveOrg: (orgId: number) => {
        const org = get().organizations.find((o) => o.id === orgId);
        if (org) {
            saveActiveOrgCookie(org.id);
            set({ activeOrg: org });
            if (typeof window !== "undefined") {
                // Recargar de forma controlada para refrescar acervo y permisos
                window.location.reload();
            }
        }
    },

    createNewOrg: async (name: string, tax_id?: string) => {
        const newOrg = await createOrganization({ name, tax_id });
        await get().loadOrganizations();
        get().setActiveOrg(newOrg);
        return newOrg;
    },
}));
