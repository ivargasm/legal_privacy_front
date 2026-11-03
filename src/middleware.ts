import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/studio', '/library', '/profile', '/organization'];
const AUTH_PAGES = ['/auth/login', '/auth/register'];

function sharesCookieSite(frontendHost: string): boolean {
    const rawApi =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        'http://localhost:8000';
    try {
        const apiHost = new URL(rawApi).hostname.toLowerCase();
        const feHost = frontendHost.toLowerCase();
        if (feHost === apiHost) return true;
        if (
            (feHost === 'localhost' || feHost === '127.0.0.1') &&
            (apiHost === 'localhost' || apiHost === '127.0.0.1')
        ) {
            return true;
        }
        const feParts = feHost.split('.');
        const apiParts = apiHost.split('.');
        if (feParts.length >= 2 && apiParts.length >= 2) {
            return feParts.slice(-2).join('.') === apiParts.slice(-2).join('.');
        }
        return false;
    } catch {
        return true;
    }
}

function hasUnexpiredAccessCookie(token?: string): boolean {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const jsonPayload = atob(padded);
        const payload = JSON.parse(jsonPayload) as { exp?: number; type?: string; sub?: string };

        if (payload.type !== 'access' || !payload.sub) {
            return false;
        }
        if (typeof payload.exp !== 'number') {
            return false;
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        return payload.exp > nowSeconds + 2;
    } catch {
        return false;
    }
}

export function middleware(request: NextRequest) {
    // Si frontend y backend están en dominios raíz distintos, delegar validación cross-origin a ProtectedRoute (/auth/me)
    if (!sharesCookieSite(request.nextUrl.hostname)) {
        return NextResponse.next();
    }

    const { pathname, searchParams } = request.nextUrl;
    const token = request.cookies.get('access_token')?.value;
    const isValidCookie = hasUnexpiredAccessCookie(token);

    const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    const isAuthPage = AUTH_PAGES.some((page) => pathname === page);

    if (isProtected && !isValidCookie) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Si el usuario solicitó cerrar sesión explícitamente, borrar la cookie y permitir acceso a /auth/login
    if (isAuthPage && searchParams.has('logout')) {
        const res = NextResponse.next();
        res.cookies.delete('access_token');
        return res;
    }

    if (isAuthPage && isValidCookie) {
        return NextResponse.redirect(new URL('/studio', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/studio/:path*', '/library/:path*', '/profile/:path*', '/organization/:path*', '/auth/login', '/auth/register'],
};
