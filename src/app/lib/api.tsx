

export const fetchUser = async (url: string) => {
    const res = await fetch(`${url}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
};


export const login = async (email: string, password: string, url: string) => {
    const res = await fetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });
    if (res.status === 429) {
        throw new Error('Demasiados intentos. Por favor, espera un minuto e inténtalo de nuevo.');
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Credenciales incorrectas');
    }
    return res;
};

export const logout = async (url: string) => {
    const res = await fetch(`${url}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Error al cerrar sesión');
    return res;
};

export async function register(username: string, email: string, password: string, url: string) {
    const res = await fetch(`${url}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
    });

    if (res.status === 429) {
        throw new Error('Demasiados intentos. Por favor, espera un minuto e inténtalo de nuevo.');
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al registrar la cuenta');
    }

    return res.json();
}

export async function forgot_password(url: string, email: string) {
    const res = await fetch(`${url}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    if (!res.ok) throw new Error('Error al enviar el correo');
    return res;
}

export async function reset_password(url: string, new_password: string, token: string) {
    const res = await fetch(`${url}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password }),
    });

    if (!res.ok) throw new Error('Error al resetear la contraseña');
    return res;
}

export async function refreshToken(url: string) {
    const res = await fetch(`${url}/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });
    if (!res.ok) throw new Error('Error al renovar la sesión');
    return res.json();
}
