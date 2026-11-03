'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../store/Store';
import { useOrgStore } from '../store/orgStore';
import {
    getInvitationDetail,
    acceptInvitation,
    InvitationDetail,
} from '../lib/orgApi';
import {
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    LogIn,
    UserPlus,
    UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

function InviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const { user, userAuth, userValid, loginUser, registerUser, logout } = useAuthStore();
    const { loadOrganizations, switchActiveOrg } = useOrgStore();

    const [inviteDetail, setInviteDetail] = useState<InvitationDetail | null>(null);
    const [isLoadingInvite, setIsLoadingInvite] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Formulario de registro rápido si no tiene cuenta
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);

    useEffect(() => {
        userValid();
    }, [userValid]);

    const loadInvite = useCallback(async () => {
        if (!token) {
            setErrorMessage('No se proporcionó ningún token de invitación.');
            setIsLoadingInvite(false);
            return;
        }

        setIsLoadingInvite(true);
        setErrorMessage(null);
        try {
            const data = await getInvitationDetail(token);
            setInviteDetail(data);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Invitación no válida o expirada.');
        } finally {
            setIsLoadingInvite(false);
        }
    }, [token]);

    useEffect(() => {
        loadInvite();
    }, [loadInvite]);

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'owner':
                return 'Socio Director';
            case 'admin':
                return 'Administrador';
            case 'lawyer':
                return 'Abogado Asociado';
            case 'guest':
                return 'Pasante / Auditor';
            default:
                return role;
        }
    };

    const handleAcceptLoggedIn = async () => {
        if (!token) return;
        setIsAccepting(true);
        try {
            const res = await acceptInvitation(token);
            toast.success(`¡Te has unido exitosamente a ${res.organization_name}!`);
            await loadOrganizations();
            switchActiveOrg(res.organization_id);
            router.push('/studio');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al aceptar invitación');
            setIsAccepting(false);
        }
    };

    const handleRegisterAndAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteDetail || !token) return;

        if (regPassword.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (regPassword !== regConfirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Registrar usuario asociado a la invitación (no se le crea despacho como owner)
            await registerUser(regUsername.trim(), inviteDetail.email, regPassword, token);

            // 2. Iniciar sesión
            await loginUser(inviteDetail.email, regPassword, '');

            // 3. Aceptar invitación
            const res = await acceptInvitation(token);
            toast.success(`¡Cuenta creada y bienvenido a ${res.organization_name}!`);

            // 4. Actualizar store y redirigir
            await loadOrganizations();
            switchActiveOrg(res.organization_id);
            router.push('/studio');
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Error al crear cuenta y unirse');
            setIsSubmitting(false);
        }
    };

    if (isLoadingInvite) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500">Verificando invitación criptográfica...</p>
            </div>
        );
    }

    if (errorMessage || !inviteDetail) {
        return (
            <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Invitación no válida o expirada
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {errorMessage || 'Este enlace de invitación ya fue utilizado o ha caducado.'}
                </p>
                <div className="pt-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/auth/login">Ir al Inicio de Sesión</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto my-10 px-4">
            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                <CardHeader className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 font-semibold">
                        INVITACIÓN DE DESPACHO
                    </span>
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Únete a {inviteDetail.organization_name}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 mt-1">
                        Has sido invitado como{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                            {getRoleLabel(inviteDetail.role)}
                        </strong>{' '}
                        para colaborar en la plataforma de auditoría y análisis jurídico con privacidad local.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                    {/* Badge de Rol y Correo */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div>
                            <span className="text-slate-400 block text-[10px]">CORREO DESTINO</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                {inviteDetail.email}
                            </span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                            {getRoleLabel(inviteDetail.role)}
                        </Badge>
                    </div>

                    {/* Caso 1: Usuario con Sesión Activa */}
                    {userAuth && user ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                    Sesión activa como <strong>{user.username}</strong> ({user.email}).
                                </span>
                            </div>

                            <Button
                                onClick={handleAcceptLoggedIn}
                                disabled={isAccepting}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-10 shadow-xs"
                            >
                                {isAccepting ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                Aceptar Invitación y Unirme
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                                >
                                    ¿No eres {user.username}? Iniciar con otra cuenta
                                </button>
                            </div>
                        </div>
                    ) : inviteDetail.is_user_registered ? (
                        /* Caso 2: El usuario ya tiene cuenta pero no ha iniciado sesión */
                        <div className="space-y-4 text-center">
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Ya tienes una cuenta en Legal Privacy vinculada a <strong>{inviteDetail.email}</strong>. Inicia sesión para aceptar la invitación y vincular este despacho.
                            </p>

                            <Button
                                asChild
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-10 shadow-xs"
                            >
                                <Link href={`/auth/login?from=/invite?token=${encodeURIComponent(token || '')}`}>
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Iniciar Sesión para Aceptar
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        /* Caso 3: Usuario Nuevo — Registro Rápido */
                        <form onSubmit={handleRegisterAndAccept} className="space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Completa tu registro para crear tu usuario y unirte de inmediato a{' '}
                                <strong>{inviteDetail.organization_name}</strong>.
                            </p>

                            <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Nombre Completo o de Usuario
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={regUsername}
                                    onChange={(e) => setRegUsername(e.target.value)}
                                    placeholder="Lic. Roberto Gómez"
                                    className="mt-1 w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    placeholder="Mínimo 8 caracteres"
                                    className="mt-1 w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Confirmar Contraseña
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={regConfirmPassword}
                                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                                    placeholder="Repite la contraseña"
                                    className="mt-1 w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-10 shadow-xs"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <UserPlus className="w-4 h-4 mr-2" />
                                )}
                                Crear Cuenta y Unirme al Despacho
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function InvitePage() {
    return (
        <div className="w-full min-h-[calc(100vh-3.75rem)] mt-15 py-8 px-4 sm:px-6 bg-[#FAFAFA] dark:bg-slate-950 flex items-center justify-center">
            <Suspense
                fallback={
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                }
            >
                <InviteContent />
            </Suspense>
        </div>
    );
}
