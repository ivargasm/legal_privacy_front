import { create } from 'zustand';
import { login, fetchUser, logout, register, refreshToken } from "../lib/api";

interface AuthState {
    user: { id: string; username: string; email: string; role: string; exp?: number; created_at?: string } | null;
    setUser: (user: AuthState['user']) => void;
    logout: () => void;
    url: string;
    loginUser: (email: string, password: string, ur: string) => Promise<void>;
    userAuth: boolean;
    isLoading: boolean;
    userValid: () => Promise<void>;
    registerUser: (username: string, email: string, password: string) => Promise<unknown>;
    renewSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    userAuth: false,
    isLoading: true,
    url: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
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
            const data = await logout(useAuthStore.getState().url);
            if (!data) {
                return;
            }
            set({ user: null, userAuth: false });
            window.location.href = "/auth/login";
        } catch (error) {
            console.error("Error al cerrar sesión", error);
        }
    },
    registerUser: async (username, email, password) => {
        const data = await register(username, email, password, useAuthStore.getState().url);
        return data;
    },
    renewSession: async () => {
        try {
            await refreshToken(useAuthStore.getState().url);
            await useAuthStore.getState().userValid(); // Vuelve a cargar el estado de usuario para actualizar exp
        } catch (error) {
            console.error("Error renovando sesión", error);
            useAuthStore.getState().logout();
        }
    }

}));
