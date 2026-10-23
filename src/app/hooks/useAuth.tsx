import { useEffect } from 'react';
import { useAuthStore } from '../store/Store';
import { fetchUser } from '../lib/api'; // Función para obtener el usuario

export const useAuth = () => {
    const { user, setUser, logout, url } = useAuthStore();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const userData = await fetchUser(url);
                if (userData) {
                    setUser(userData);
                }
            } catch {
                logout();
            }
        };

        checkUser();
    }, [setUser, logout, url]);

    return { user, logout };
};
