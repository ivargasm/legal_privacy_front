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
        const errorData = await res.json().catch(() => null);
        throw new Error(
            errorData?.detail || 'Demasiados intentos. Por favor espera un minuto e inténtalo de nuevo.'
        );
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Credenciales incorrectas');
    }
    return res;
};

export const logout = async (url: string) => {
    try {
        const res = await fetch(`${url}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
        return res;
    } catch (e) {
        console.warn('Network issue during logout request to backend:', e);
        return null;
    }
};

export async function register(
    username: string,
    email: string,
    password: string,
    url: string,
    invitation_token?: string
) {
    const res = await fetch(`${url}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, invitation_token }),
    });

    if (res.status === 429) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
            errorData?.detail || 'Demasiados intentos. Por favor espera un minuto e inténtalo de nuevo.'
        );
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al registrar la cuenta');
    }

    return res.json();
}

export async function forgot_password(url: string, email: string) {
    const res = await fetch(`${url}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    if (res.status === 429) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
            errorData?.detail || 'Demasiadas solicitudes de recuperación. Espera un minuto.'
        );
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al enviar el correo');
    }
    return res;
}

export async function reset_password(url: string, new_password: string, token: string) {
    const res = await fetch(`${url}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password }),
    });

    if (res.status === 429) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Demasiados intentos. Espera un minuto.');
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al restablecer la contraseña');
    }
    return res;
}

export async function refreshToken(url: string) {
    const res = await fetch(`${url}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Error al renovar la sesión');
    }
    return res.json();
}
