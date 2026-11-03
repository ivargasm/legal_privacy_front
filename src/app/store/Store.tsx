import { create } from 'zustand';
import { login, fetchUser, logout, register, refreshToken } from "../lib/api";
import { API_URL } from "../lib/documentApi";

interface AuthState {
    user: { id: string | number; username: string; email: string; role: string; exp?: number; created_at?: string } | null;
    setUser: (user: AuthState['user']) => void;
    logout: () => Promise<void>;
    url: string;
    loginUser: (email: string, password: string, ur: string) => Promise<void>;
    userAuth: boolean;
    isLoading: boolean;
    userValid: () => Promise<void>;
    registerUser: (username: string, email: string, password: string, invitation_token?: string) => Promise<unknown>;
    renewSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    userAuth: false,
    isLoading: true,
    url: API_URL,
    setUser: (user) => set({ user }),
    loginUser: async (email, password) => {
        const data = await login(email, password, useAuthStore.getState().url);
        if (!data) {
            return;
        }
        const user_data = await fetchUser(useAuthStore.getState().url)
        if (!user_data) {
            return;
        }
        set({ userAuth: true });
        set({ user: user_data });
    },
    userValid: async () => {
        set({ isLoading: true });
        try {
            const data = await fetchUser(useAuthStore.getState().url);
            if (!data) {
                set({ userAuth: false, user: null, isLoading: false });  // Asegurar que se limpie el estado
                return;
            }
            set({ userAuth: true, user: data, isLoading: false });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            set({ userAuth: false, user: null, isLoading: false });
        }
    },
    // 📌 Cerrar sesión
    logout: async () => {
        try {
            await logout(useAuthStore.getState().url);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        } finally {
            set({ user: null, userAuth: false, isLoading: false });
            if (typeof window !== "undefined") {
                window.location.href = "/auth/login?logout=1";
            }
        }
    },
    registerUser: async (username, email, password, invitation_token) => {
        const data = await register(username, email, password, useAuthStore.getState().url, invitation_token);
        return data;
    },
    renewSession: async () => {
        try {
            const updatedUser = await refreshToken(useAuthStore.getState().url);
            if (updatedUser && updatedUser.exp) {
                set({ user: updatedUser, userAuth: true });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error renovando sesión:", error);
            await useAuthStore.getState().logout();
            return false;
        }
    }

}));
