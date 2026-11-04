'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '../components/ProtectedRoutes';
import { useOrgStore } from '../store/orgStore';
import { useAuthStore } from '../store/Store';
import {
    Member,
    Invitation,
    fetchMembers,
    fetchPendingInvitations,
    updateMemberRole,
    updateMemberStatus,
    removeMember,
    inviteMember,
    revokeInvitation,
    updateOrganization,
} from '../lib/orgApi';
import {
    BillingStatus,
    fetchBillingStatus,
    createCheckoutSession,
    createCustomerPortalSession,
    simulatePlanUpgrade,
    changeSubscriptionPlan,
    cancelSubscription,
    reactivateSubscription,
} from '../lib/billingApi';
import {
    Building2,
    Users,
    Mail,
    Trash2,
    UserPlus,
    Edit3,
    Loader2,
    Ban,
    UserCheck,
    CreditCard,
    CheckCircle2,
    Sparkles,
    ExternalLink,
    Zap,
    AlertCircle,
    ArrowUpRight,
    FileText,
    Check,
    ShieldCheck,
    Lock,
    FolderKanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import AuditLogView from '@/components/organization/AuditLogView';
import { toast } from 'sonner';

export default function OrganizationPage() {
    const { activeOrg, loadOrganizations } = useOrgStore();
    const { user } = useAuthStore();

    // Active tab: 'team' | 'billing' | 'audit'
    const [activeTab, setActiveTab] = useState<'team' | 'billing' | 'audit'>('team');

    // Team state
    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit org modal state
    const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editTaxId, setEditTaxId] = useState('');
    const [isSavingOrg, setIsSavingOrg] = useState(false);

    // Invite modal state
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'lawyer' | 'guest'>('lawyer');
    const [isSendingInvite, setIsSendingInvite] = useState(false);

    // Member action states
    const [actionMemberId, setActionMemberId] = useState<number | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
    const [isRemovingMember, setIsRemovingMember] = useState(false);
    const [inviteToRevoke, setInviteToRevoke] = useState<Invitation | null>(null);
    const [isRevokingInvite, setIsRevokingInvite] = useState(false);

    // Billing state
    const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
    const [isLoadingBilling, setIsLoadingBilling] = useState(false);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [checkoutTier, setCheckoutTier] = useState<'starter' | 'pro' | null>(null);
    const [isOpeningPortal, setIsOpeningPortal] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);

    const currentUserRole = activeOrg?.current_user_role;
    const isOwner = currentUserRole === 'owner';
    const isAdmin = currentUserRole === 'admin';
    const canManageMembers = isOwner || isAdmin;

    const loadTeamData = useCallback(async () => {
        if (!activeOrg) return;
        setIsLoading(true);
        try {
            const [membersData, invitesData] = await Promise.all([
                fetchMembers(activeOrg.id),
                fetchPendingInvitations(activeOrg.id).catch(() => [] as Invitation[]),
            ]);
            setMembers(membersData);
            setInvitations(invitesData);
        } catch (error) {
            console.error('Error cargando equipo:', error);
            toast.error('No se pudo cargar la información del equipo.');
        } finally {
            setIsLoading(false);
        }
    }, [activeOrg]);

    const loadBillingData = useCallback(async () => {
        if (!activeOrg) return;
        setIsLoadingBilling(true);
        try {
            const statusData = await fetchBillingStatus(activeOrg.id);
            setBillingStatus(statusData);
        } catch (error) {
            console.error('Error cargando facturación:', error);
            // Si el endpoint no responde aún, no bloqueamos la interfaz
        } finally {
            setIsLoadingBilling(false);
        }
    }, [activeOrg]);

    useEffect(() => {
        if (activeOrg) {
            setEditName(activeOrg.name);
            setEditTaxId(activeOrg.tax_id || '');
            loadTeamData();
            loadBillingData();
        }
    }, [activeOrg, loadTeamData, loadBillingData]);

    // Check query params on mount for tabs and Stripe callbacks
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'billing') {
                setActiveTab('billing');
            } else if (params.get('tab') === 'audit') {
                setActiveTab('audit');
            }
            if (params.get('billing') === 'success') {
                toast.success('¡Suscripción actualizada exitosamente! Gracias por confiar en Legal Privacy.');
                setActiveTab('billing');
            } else if (params.get('billing') === 'cancelled') {
                toast.info('El proceso de suscripción fue cancelado.');
                setActiveTab('billing');
            } else if (params.get('billing') === 'simulated_success') {
                const plan = params.get('plan') as 'starter' | 'pro';
                if (plan && activeOrg) {
                    simulatePlanUpgrade(plan, activeOrg.id)
                        .then((status) => {
                            setBillingStatus(status);
                            toast.success(`Plan ${plan === 'starter' ? 'Starter' : 'Despacho Pro'} activado exitosamente.`);
                            setActiveTab('billing');
                        })
                        .catch((err) => toast.error(err.message));
                }
            }
        }
    }, [activeOrg]);

    const handleUpdateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOrg || !editName.trim()) return;
        setIsSavingOrg(true);
        try {
            await updateOrganization(activeOrg.id, {
                name: editName.trim(),
                tax_id: editTaxId.trim() || undefined,
            });
            toast.success('Información del despacho actualizada');
            setIsEditOrgOpen(false);
            await loadOrganizations();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al actualizar despacho');
        } finally {
            setIsSavingOrg(false);
        }
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOrg || !inviteEmail.trim()) return;
        setIsSendingInvite(true);
        try {
            await inviteMember(activeOrg.id, {
                email: inviteEmail.trim().toLowerCase(),
                role: inviteRole,
            });
            toast.success(`Invitación enviada por correo a ${inviteEmail}`);
            setInviteEmail('');
            setIsInviteOpen(false);
            await loadTeamData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al enviar invitación');
        } finally {
            setIsSendingInvite(false);
        }
    };

    const handleRoleChange = async (member: Member, newRole: 'admin' | 'lawyer' | 'guest') => {
        if (!activeOrg) return;
        setActionMemberId(member.user_id);
        try {
            await updateMemberRole(activeOrg.id, member.user_id, newRole);
            toast.success(`Rol de ${member.username} actualizado a ${getRoleLabel(newRole)}`);
            await loadTeamData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al cambiar rol');
        } finally {
            setActionMemberId(null);
        }
    };

    const handleStatusToggle = async (member: Member) => {
        if (!activeOrg) return;
        const newStatus = !member.is_active;
        setActionMemberId(member.user_id);
        try {
            await updateMemberStatus(activeOrg.id, member.user_id, newStatus);
            toast.success(
                `Miembro ${member.username} ${newStatus ? 'reactivado' : 'suspendido'} en este despacho.`
            );
            await loadTeamData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al cambiar estatus');
        } finally {
            setActionMemberId(null);
        }
    };

    const handleConfirmRemove = async () => {
        if (!activeOrg || !memberToRemove) return;
        setIsRemovingMember(true);
        setActionMemberId(memberToRemove.user_id);
        try {
            await removeMember(activeOrg.id, memberToRemove.user_id);
            toast.success(`Miembro ${memberToRemove.username} removido del despacho.`);
            setMemberToRemove(null);
            await loadTeamData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al remover miembro');
        } finally {
            setIsRemovingMember(false);
            setActionMemberId(null);
        }
    };

    const handleConfirmRevoke = async () => {
        if (!activeOrg || !inviteToRevoke) return;
        setIsRevokingInvite(true);
        try {
            await revokeInvitation(activeOrg.id, inviteToRevoke.id);
            toast.success(`Invitación enviada a ${inviteToRevoke.email} revocada exitosamente.`);
            setInviteToRevoke(null);
            await loadTeamData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al revocar invitación');
        } finally {
            setIsRevokingInvite(false);
        }
    };

    const handleSelectPlan = async (tier: 'starter' | 'pro') => {
        if (!activeOrg) return;
        if (!isOwner) {
            toast.error('Solo el Socio Director (Owner) del despacho puede contratar o modificar suscripciones.');
            return;
        }

        // Si ya cuenta con una suscripción de Stripe activa (Starter o Pro), es un cambio directo con prorrateo automático
        if (billingStatus?.has_active_subscription) {
            setIsProcessingCheckout(true);
            setCheckoutTier(tier);
            try {
                const updated = await changeSubscriptionPlan(tier, activeOrg.id);
                setBillingStatus(updated);
                toast.success(`¡Plan cambiado a ${tier === 'pro' ? 'Despacho Pro' : 'Starter'} exitosamente!`);
                await loadOrganizations();
                await loadTeamData();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Error al cambiar de plan');
            } finally {
                setIsProcessingCheckout(false);
                setCheckoutTier(null);
            }
            return;
        }

        // Si viene del plan gratuito, es una contratación inicial por Stripe Checkout
        setIsProcessingCheckout(true);
        setCheckoutTier(tier);
        try {
            const checkoutUrl = await createCheckoutSession(tier, activeOrg.id);
            if (checkoutUrl.startsWith('http://') || checkoutUrl.startsWith('https://')) {
                window.location.href = checkoutUrl;
            } else {
                toast.success('Redirigiendo a pasarela...');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al iniciar suscripción');
        } finally {
            setIsProcessingCheckout(false);
            setCheckoutTier(null);
        }
    };

    const handleCancelConfirm = async () => {
        if (!activeOrg) return;
        setIsCanceling(true);
        try {
            const res = await cancelSubscription(activeOrg.id);
            toast.success(res.message);
            setIsCancelModalOpen(false);
            await loadBillingData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al cancelar la suscripción');
        } finally {
            setIsCanceling(false);
        }
    };

    const handleReactivate = async () => {
        if (!activeOrg) return;
        setIsReactivating(true);
        try {
            const updated = await reactivateSubscription(activeOrg.id);
            setBillingStatus(updated);
            toast.success('¡Suscripción reactivada exitosamente! Se renovará automáticamente.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al reactivar la suscripción');
        } finally {
            setIsReactivating(false);
        }
    };

    const handleOpenPortal = async () => {
        if (!activeOrg) return;
        if (!isOwner) {
            toast.error('Solo el Socio Director tiene acceso a las facturas y métodos de pago de Stripe.');
            return;
        }
        setIsOpeningPortal(true);
        try {
            const portalUrl = await createCustomerPortalSession(activeOrg.id);
            if (portalUrl.startsWith('http://') || portalUrl.startsWith('https://')) {
                window.location.href = portalUrl;
            } else {
                toast.success('Redirigiendo al portal de Stripe...');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al abrir portal de facturación');
        } finally {
            setIsOpeningPortal(false);
        }
    };

    const handleSimulateUpgrade = async (tier: 'starter' | 'pro') => {
        if (!activeOrg) return;
        setIsSimulating(true);
        try {
            const updated = await simulatePlanUpgrade(tier, activeOrg.id);
            setBillingStatus(updated);
            toast.success(`Plan ${tier === 'starter' ? 'Starter' : 'Despacho Pro'} activado en simulación local.`);
            await loadOrganizations();
            await loadTeamData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al simular actualización');
        } finally {
            setIsSimulating(false);
        }
    };

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

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'owner':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'admin':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            case 'lawyer':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'guest':
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
            default:
                return '';
        }
    };

    const getPlanBadge = (tier: string) => {
        switch (tier) {
            case 'free':
                return {
                    label: 'Plan Gratuito (Cortesía)',
                    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                };
            case 'starter':
                return {
                    label: 'Plan Starter ($499 MXN)',
                    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                };
            case 'pro':
                return {
                    label: 'Despacho Pro ($1,899 MXN)',
                    color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                };
            case 'enterprise':
                return {
                    label: 'Corporativo / Enterprise',
                    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                };
            default:
                return {
                    label: tier,
                    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
                };
        }
    };

    return (
        <ProtectedRoute>
            <div className="w-full min-h-[calc(100vh-3.75rem)] mt-15 py-8 px-4 sm:px-6 bg-background pb-20">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
                        <div>
                            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                                GESTIÓN DE DESPACHO Y EQUIPO
                            </span>
                            <div className="flex items-center gap-3 mt-1">
                                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                    {activeOrg?.name || 'Cargando despacho...'}
                                </h1>
                                {currentUserRole && (
                                    <Badge
                                        variant="outline"
                                        className={`text-xs px-2.5 py-0.5 font-medium ${getRoleBadgeVariant(
                                            currentUserRole
                                        )}`}
                                    >
                                        Tu rol: {getRoleLabel(currentUserRole)}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                                Control de miembros, roles jerárquicos (RBAC), invitaciones y facturación en MXN con aislamiento criptográfico multi-tenant.
                            </p>
                        </div>

                        {canManageMembers && activeTab === 'team' && (
                            <div className="flex items-center gap-2.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditOrgOpen(true)}
                                    className="text-xs h-9"
                                >
                                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                                    Ajustes del Despacho
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setIsInviteOpen(true)}
                                    className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
                                >
                                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                                    Invitar Miembro
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs Switcher */}
                    <div className="flex items-center gap-3 border-b border-border pb-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('team')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer ${
                                activeTab === 'team'
                                    ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            <span>Miembros y Despacho</span>
                            <span className="ml-1 text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                                {members.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('billing')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer ${
                                activeTab === 'billing'
                                    ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Facturación y Suscripción</span>
                            {billingStatus && (
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0.2 font-mono uppercase ${
                                        billingStatus.plan_tier === 'free'
                                            ? 'bg-muted text-muted-foreground border-border'
                                            : 'bg-accent/30 text-accent-foreground border-accent/40'
                                    }`}
                                >
                                    {billingStatus.plan_tier === 'free' ? 'Prueba' : billingStatus.plan_tier}
                                </Badge>
                            )}
                        </button>

                        {canManageMembers && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('audit')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer ${
                                    activeTab === 'audit'
                                        ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>Bitácora y Cumplimiento</span>
                                <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0.2 bg-muted text-foreground border-border font-mono"
                                >
                                    Auditoría
                                </Badge>
                            </button>
                        )}
                    </div>

                    {/* TAB 1: MIEMBROS Y DESPACHO */}
                    {activeTab === 'team' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            {/* Despacho Metadata Cards */}
                            {activeOrg && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                                        <span className="text-xs text-slate-500 font-medium">Nombre & Slug</span>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                                            {activeOrg.name}
                                        </p>
                                        <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                                            ID: {activeOrg.id} • /{activeOrg.slug}
                                        </p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                                        <span className="text-xs text-slate-500 font-medium">Registro Fiscal (RFC)</span>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                                            {activeOrg.tax_id || 'No asignado'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Facturación y membretes oficiales
                                        </p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500 font-medium">Capacidad de Miembros</span>
                                            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                                                Plan {billingStatus?.plan_tier ? billingStatus.plan_tier.toUpperCase() : 'ACTIVO'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                                            {members.length} / {activeOrg.max_members} abogados
                                        </p>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                                            <div
                                                className="bg-indigo-600 h-1.5 rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        (members.length / Math.max(1, activeOrg.max_members)) * 100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Miembros del Despacho Table */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                                <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                    <div>
                                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-600" />
                                            <span>Miembros Activos e Integrantes ({members.length})</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Cada abogado opera con acceso estricto a las sesiones y acervo de este despacho.
                                        </p>
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                        <span className="text-sm">Cargando integrantes del despacho...</span>
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500 text-sm">
                                        No se encontraron miembros en este despacho.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs sm:text-sm">
                                            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 font-medium border-b border-slate-200/60 dark:border-slate-800">
                                                <tr>
                                                    <th className="py-3 px-6">Usuario</th>
                                                    <th className="py-3 px-4">Correo</th>
                                                    <th className="py-3 px-4">Rol Asignado</th>
                                                    <th className="py-3 px-4">Estado</th>
                                                    <th className="py-3 px-4">Fecha de Unión</th>
                                                    {canManageMembers && (
                                                        <th className="py-3 px-6 text-right">Acciones</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {members.map((member) => {
                                                    const isSelf = member.user_id === user?.id;
                                                    const isMemberOwner = member.role === 'owner';
                                                    const canEditThisMember =
                                                        canManageMembers &&
                                                        !isMemberOwner &&
                                                        (!isSelf || isOwner);

                                                    return (
                                                        <tr
                                                            key={member.id}
                                                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                                        >
                                                            <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-xs shrink-0">
                                                                    {member.username.slice(0, 2).toUpperCase()}
                                                                </div>
                                                                <span className="truncate max-w-[140px] sm:max-w-none">
                                                                    {member.username}
                                                                </span>
                                                                {isSelf && (
                                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                                        (Tú)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                                                {member.email}
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                {isMemberOwner ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs px-2 py-0.5 font-medium ${getRoleBadgeVariant(
                                                                            'owner'
                                                                        )}`}
                                                                    >
                                                                        Socio Director
                                                                    </Badge>
                                                                ) : canEditThisMember && isOwner ? (
                                                                    <select
                                                                        value={member.role}
                                                                        disabled={actionMemberId === member.user_id}
                                                                        onChange={(e) =>
                                                                            handleRoleChange(
                                                                                member,
                                                                                e.target.value as
                                                                                    | 'admin'
                                                                                    | 'lawyer'
                                                                                    | 'guest'
                                                                            )
                                                                        }
                                                                        className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                    >
                                                                        <option value="admin">Administrador</option>
                                                                        <option value="lawyer">Abogado Asociado</option>
                                                                        <option value="guest">Pasante / Auditor</option>
                                                                    </select>
                                                                ) : (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs px-2 py-0.5 font-medium ${getRoleBadgeVariant(
                                                                            member.role
                                                                        )}`}
                                                                    >
                                                                        {getRoleLabel(member.role)}
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                {member.is_active ? (
                                                                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                        Activo
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                        Suspendido
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-xs text-slate-500">
                                                                {new Date(member.joined_at).toLocaleDateString('es-MX', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                })}
                                                            </td>
                                                            {canManageMembers && (
                                                                <td className="py-3.5 px-6 text-right">
                                                                    {canEditThisMember && (
                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                disabled={actionMemberId === member.user_id}
                                                                                onClick={() => handleStatusToggle(member)}
                                                                                className={`text-xs h-7 px-2 ${
                                                                                    member.is_active
                                                                                        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                                                                        : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                                                }`}
                                                                                title={
                                                                                    member.is_active
                                                                                        ? 'Suspender acceso a este despacho'
                                                                                        : 'Reactivar acceso a este despacho'
                                                                                }
                                                                            >
                                                                                {member.is_active ? (
                                                                                    <>
                                                                                        <Ban className="w-3.5 h-3.5 mr-1" />
                                                                                        <span>Suspender</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                                                                                        <span>Reactivar</span>
                                                                                    </>
                                                                                )}
                                                                            </Button>

                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                disabled={actionMemberId === member.user_id}
                                                                                onClick={() => setMemberToRemove(member)}
                                                                                className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                                                title="Remover del despacho"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Invitaciones Pendientes Section */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                                <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-indigo-600" />
                                        <span>Invitaciones Pendientes ({invitations.length})</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Enlaces de acceso único enviados por correo vía Resend. Válidos durante 7 días.
                                    </p>
                                </div>

                                {invitations.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
                                        No hay invitaciones pendientes. Usa el botón &quot;Invitar Miembro&quot; para sumar nuevos abogados o pasantes.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs sm:text-sm">
                                            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 font-medium border-b border-slate-200/60 dark:border-slate-800">
                                                <tr>
                                                    <th className="py-3 px-6">Correo Destino</th>
                                                    <th className="py-3 px-4">Rol Ofrecido</th>
                                                    <th className="py-3 px-4">Invitado Por</th>
                                                    <th className="py-3 px-4">Expira en</th>
                                                    {canManageMembers && (
                                                        <th className="py-3 px-6 text-right">Acciones</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {invitations.map((inv) => (
                                                    <tr
                                                        key={inv.id}
                                                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                                    >
                                                        <td className="py-3.5 px-6 font-mono text-xs text-slate-900 dark:text-white">
                                                            {inv.email}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs px-2 py-0.5 font-medium ${getRoleBadgeVariant(
                                                                    inv.role
                                                                )}`}
                                                            >
                                                                {getRoleLabel(inv.role)}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                                                            {inv.invited_by_name}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-xs text-slate-500">
                                                            {new Date(inv.expires_at).toLocaleDateString('es-MX', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                            })}
                                                        </td>
                                                        {canManageMembers && (
                                                            <td className="py-3.5 px-6 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setInviteToRevoke(inv)}
                                                                    className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                                    title="Revocar invitación"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                                    <span>Revocar</span>
                                                                </Button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: FACTURACIÓN Y PLANES (FASE 8) */}
                    {activeTab === 'billing' && (
                        isLoadingBilling && !billingStatus ? (
                            <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                <span className="text-sm">Cargando estado de facturación...</span>
                            </div>
                        ) : (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            {/* Current Subscription Card */}
                            {billingStatus && (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                                                    ESTADO DE LA SUSCRIPCIÓN
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs px-2.5 py-0.5 font-medium ${
                                                        getPlanBadge(billingStatus.plan_tier).color
                                                    }`}
                                                >
                                                    {getPlanBadge(billingStatus.plan_tier).label}
                                                </Badge>
                                                {billingStatus.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Activa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                        <AlertCircle className="w-3 h-3" />
                                                        {billingStatus.status}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {billingStatus.plan_tier === 'free'
                                                    ? 'Plan gratuito con 3 análisis de documentos de cortesía. Sin fecha de expiración por días.'
                                                    : `Ciclo mensual activo • Próximo corte: ${
                                                          billingStatus.current_period_end
                                                              ? new Date(billingStatus.current_period_end).toLocaleDateString(
                                                                    'es-MX',
                                                                    { year: 'numeric', month: 'long', day: 'numeric' }
                                                                )
                                                              : 'Renovación automática'
                                                      }`}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2.5">
                                            {isOwner && billingStatus.has_active_subscription && !billingStatus.cancel_at_period_end && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsCancelModalOpen(true)}
                                                    className="text-xs h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                >
                                                    Cancelar Suscripción
                                                </Button>
                                            )}

                                            {isOwner && billingStatus.stripe_customer_id && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isOpeningPortal}
                                                    onClick={handleOpenPortal}
                                                    className="text-xs h-9 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border-slate-200 dark:border-slate-700"
                                                >
                                                    {isOpeningPortal ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                    ) : (
                                                        <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                                                    )}
                                                    Portal de Facturas & Tarjetas (Stripe)
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Alerta de cancelación programada */}
                                    {billingStatus.cancel_at_period_end && (
                                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                                <div>
                                                    <strong>Cancelación programada:</strong> Tu suscripción se cancelará el{' '}
                                                    {billingStatus.current_period_end
                                                        ? new Date(billingStatus.current_period_end).toLocaleDateString('es-MX', {
                                                              year: 'numeric',
                                                              month: 'long',
                                                              day: 'numeric',
                                                          })
                                                        : 'final del ciclo'}
                                                    . Conservarás todos los beneficios pagados hasta esa fecha.
                                                </div>
                                            </div>
                                            {isOwner && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isReactivating}
                                                    onClick={handleReactivate}
                                                    className="text-xs h-8 bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 shrink-0"
                                                >
                                                    {isReactivating ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                    ) : null}
                                                    Reactivar Suscripción
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {/* Usage Metrics Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        {/* Doc Usage Metric */}
                                        <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4.5 space-y-2.5">
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span className="font-medium flex items-center gap-1.5">
                                                    <FileText className="w-4 h-4 text-indigo-600" />
                                                    Documentos Analizados
                                                </span>
                                                <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                    {billingStatus.documents_analyzed} / {billingStatus.document_limit}
                                                </span>
                                            </div>

                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-500 ${
                                                        billingStatus.documents_analyzed >= billingStatus.document_limit
                                                            ? 'bg-rose-500'
                                                            : billingStatus.documents_analyzed / billingStatus.document_limit > 0.7
                                                            ? 'bg-amber-500'
                                                            : 'bg-indigo-600'
                                                    }`}
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            (billingStatus.documents_analyzed / Math.max(1, billingStatus.document_limit)) * 100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>

                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {billingStatus.plan_tier === 'free'
                                                    ? billingStatus.documents_remaining > 0
                                                        ? `Te restan ${billingStatus.documents_remaining} de 3 documentos de prueba.`
                                                        : 'Cuota de prueba agotada. Actualiza a Starter o Pro para seguir.'
                                                    : `Te restan ${billingStatus.documents_remaining} contratos en el ciclo actual.`}
                                            </p>
                                        </div>

                                        {/* Members Metric */}
                                        <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4.5 space-y-2.5">
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span className="font-medium flex items-center gap-1.5">
                                                    <Users className="w-4 h-4 text-purple-600" />
                                                    Asientos de Abogados
                                                </span>
                                                <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                    {billingStatus.members_count} / {billingStatus.max_members}
                                                </span>
                                            </div>

                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            (billingStatus.members_count / Math.max(1, billingStatus.max_members)) * 100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>

                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {billingStatus.max_members <= 1
                                                    ? 'Plan individual (1 titular). Pro permite hasta 5 miembros.'
                                                    : `Capacidad para hasta ${billingStatus.max_members} asociados o pasantes.`}
                                            </p>
                                        </div>

                                        {/* Private Firm Library Metric */}
                                        <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4.5 space-y-2.5 flex flex-col justify-between">
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span className="font-medium flex items-center gap-1.5">
                                                    <FolderKanban className="w-4 h-4 text-emerald-600" />
                                                    Acervo Privado del Despacho
                                                </span>
                                            </div>

                                            <div>
                                                {billingStatus.plan_tier === 'pro' || billingStatus.plan_tier === 'enterprise' ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                                        <ShieldCheck className="w-4 h-4" />
                                                        <span>Habilitado (Machotes & Precedentes)</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                        <Lock className="w-4 h-4 text-slate-400" />
                                                        <span>Exclusivo de Despacho Pro</span>
                                                    </div>
                                                )}
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                                    {billingStatus.plan_tier === 'pro' || billingStatus.plan_tier === 'enterprise'
                                                        ? 'Indexación privada con aislamiento estricto por tenant.'
                                                        : 'Actualiza a Pro para vectorizar formatos internos de la firma.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Plan Selection Cards (en Pesos Mexicanos MXN) */}
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                                        Planes Diseñados para la Práctica Jurídica
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        Cobros transparentes en Pesos Mexicanos (MXN) a través de Stripe Billing. Descarga comprobantes fiscales y factura a tu RFC.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* 1. Plan Gratuito */}
                                    <div
                                        className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                                            billingStatus?.plan_tier === 'free'
                                                ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                                                : 'border-slate-200/80 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono uppercase font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                                                    Cortesía
                                                </span>
                                                {billingStatus?.plan_tier === 'free' && (
                                                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Plan Actual
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                    Plan Gratuito
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Para evaluar la anonimización local Zero-Trust sin compromiso.
                                                </p>
                                            </div>

                                            <div className="pt-2 pb-1 border-y border-slate-100 dark:border-slate-800">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                                        $0
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">MXN / Vitalicio</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    3 documentos de prueba incluidos
                                                </p>
                                            </div>

                                            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    <span><strong>3 documentos</strong> de prueba en total</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    <span>1 abogado titular</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    <span>Anonimización Zero-Trust local 100%</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    <span>Biblioteca Pública SCJN y Leyes</span>
                                                </li>
                                                <li className="flex items-center gap-2 text-slate-400">
                                                    <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span>Sin acervo privado del despacho</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="pt-6">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled
                                                className="w-full text-xs h-10 border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40"
                                            >
                                                {billingStatus?.plan_tier === 'free' ? 'Plan Activo de Cortesía' : 'Plan Básico'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 2. Plan Starter */}
                                    <div
                                        className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                                            billingStatus?.plan_tier === 'starter'
                                                ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                                                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono uppercase font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                                    Abogado Titular
                                                </span>
                                                {billingStatus?.plan_tier === 'starter' && (
                                                    <span className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Plan Actual
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                    Plan Starter
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Para abogados independientes que revisan contratos regularmente.
                                                </p>
                                            </div>

                                            <div className="pt-2 pb-1 border-y border-slate-100 dark:border-slate-800">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                                        $499
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">MXN / mes</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Facturación mensual recurrente en Stripe
                                                </p>
                                            </div>

                                            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                    <span><strong>50 documentos</strong> al mes</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                    <span>1 abogado titular</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                    <span>Facturas fiscales descargables (PDF)</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                    <span>Copiloto de dictamen y redacción</span>
                                                </li>
                                                <li className="flex items-center gap-2 text-slate-400">
                                                    <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span>Sin acervo privado del despacho</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="pt-6">
                                            {billingStatus?.plan_tier === 'starter' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                    className="w-full text-xs h-10 border-indigo-200 text-indigo-600 bg-indigo-50/50 font-medium"
                                                >
                                                    Plan Actual Contratado
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    disabled={isProcessingCheckout || !isOwner}
                                                    onClick={() => handleSelectPlan('starter')}
                                                    className="w-full text-xs h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                                                >
                                                    {isProcessingCheckout && checkoutTier === 'starter' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                                    ) : (
                                                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                                                    )}
                                                    {isOwner
                                                        ? billingStatus?.plan_tier === 'pro'
                                                            ? 'Cambiar a Starter ($499 MXN)'
                                                            : 'Contratar Starter ($499 MXN)'
                                                        : 'Solo Socio Director'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Despacho Pro (Recomendado) */}
                                    <div
                                        className={`relative bg-white dark:bg-slate-900 rounded-2xl border-2 p-6 flex flex-col justify-between transition-all ${
                                            billingStatus?.plan_tier === 'pro'
                                                ? 'border-purple-600 shadow-md ring-2 ring-purple-600/20'
                                                : 'border-purple-500/80 hover:border-purple-600 shadow-xs'
                                        }`}
                                    >
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            Recomendado para Firmas
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-xs font-mono uppercase font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                                                    Despacho & Equipo
                                                </span>
                                                {billingStatus?.plan_tier === 'pro' && (
                                                    <span className="text-xs font-medium text-purple-600 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Plan Actual
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                    Despacho Pro
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Para despachos jurídicos con equipo que necesitan machotes propios.
                                                </p>
                                            </div>

                                            <div className="pt-2 pb-1 border-y border-slate-100 dark:border-slate-800">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                                        $1,899
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">MXN / mes</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Facturación mensual recurrente para la firma
                                                </p>
                                            </div>

                                            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                    <span><strong>250 documentos</strong> al mes</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                    <span><strong>Hasta 5 abogados y pasantes</strong></span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                    <span><strong>Acervo Privado del Despacho</strong> (machotes y precedentes)</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                    <span>Aislamiento criptográfico multi-tenant</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                    <span>Copiloto de dictamen con prioridad</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                    <span>Facturas fiscales oficiales para el despacho</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="pt-6">
                                            {billingStatus?.plan_tier === 'pro' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                    className="w-full text-xs h-10 border-purple-200 text-purple-600 bg-purple-50/50 font-medium"
                                                >
                                                    Plan Actual Contratado
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    disabled={isProcessingCheckout || !isOwner}
                                                    onClick={() => handleSelectPlan('pro')}
                                                    className="w-full text-xs h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
                                                >
                                                    {isProcessingCheckout && checkoutTier === 'pro' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                                    ) : (
                                                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                                    )}
                                                    {isOwner
                                                        ? billingStatus?.plan_tier === 'starter'
                                                            ? 'Actualizar a Despacho Pro ($1,899 MXN)'
                                                            : 'Contratar Despacho Pro ($1,899 MXN)'
                                                        : 'Solo Socio Director'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Enterprise Callout Strip */}
                                <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-1.5 max-w-2xl">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                                CORPORATIVO & ENTERPRISE
                                            </span>
                                            <span className="text-xs text-slate-400">15+ abogados o alta escala</span>
                                        </div>
                                        <h3 className="text-lg font-semibold tracking-tight">
                                            ¿Requieres servidor local Ollama dedicado o asientos ilimitados?
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Ofrecemos despliegue on-premise con hardware dedicado, autenticación SSO corporativa (Google Workspace / Azure AD) y contratos de confidencialidad a medida para grandes corporativos y notarías.
                                        </p>
                                    </div>

                                    <div className="shrink-0">
                                        <a
                                            href="mailto:ventas@legalprivacy.mx?subject=Consulta%20Plan%20Corporativo%20Legal%20Privacy"
                                            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition-colors"
                                        >
                                            <span>Contactar a Ventas</span>
                                            <ArrowUpRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>

                                {/* Dev Quick-Switch Simulator */}
                                <div className="bg-slate-100/70 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span><strong>Modo de Prueba Local:</strong> Simula el cambio de plan instantáneamente sin pasar por pasarela real:</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isSimulating}
                                            onClick={() => handleSimulateUpgrade('starter')}
                                            className="text-xs h-7.5 bg-white dark:bg-slate-800"
                                        >
                                            Simular Starter ($499 MXN)
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isSimulating}
                                            onClick={() => handleSimulateUpgrade('pro')}
                                            className="text-xs h-7.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200"
                                        >
                                            Simular Pro ($1,899 MXN)
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )
                    )}

                    {/* TAB 3: BITÁCORA Y CUMPLIMIENTO ZERO-TRUST (FASE 9) */}
                    {activeTab === 'audit' && activeOrg && (
                        <div className="animate-in fade-in duration-200">
                            <AuditLogView
                                orgId={activeOrg.id}
                                orgSlug={activeOrg.slug}
                                isOwnerOrAdmin={canManageMembers}
                            />
                        </div>
                    )}

                    {/* Modales Compartidos */}
                    {/* Modal Editar Despacho */}
                    {isEditOrgOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                                        Editar Información del Despacho
                                    </h3>
                                </div>

                                <form onSubmit={handleUpdateOrg} className="space-y-4 text-xs sm:text-sm">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Nombre Oficial del Despacho
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="Ej. González & Asociados SC"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Registro Fiscal / RFC (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={editTaxId}
                                            onChange={(e) => setEditTaxId(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            placeholder="Ej. GAS980214XYZ"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isSavingOrg}
                                            onClick={() => setIsEditOrgOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={isSavingOrg || !editName.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            {isSavingOrg ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                            ) : null}
                                            Guardar Cambios
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Modal Invitar Miembro */}
                    {isInviteOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                                        Invitar Nuevo Miembro al Despacho
                                    </h3>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Se enviará un correo electrónico mediante <strong>Resend</strong> con un enlace criptográfico seguro de un solo uso. Si el abogado ya tiene cuenta en la plataforma, podrá unirse manteniendo sus demás despachos intactos.
                                </p>

                                <form onSubmit={handleSendInvite} className="space-y-4 text-xs sm:text-sm">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Correo Electrónico
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            placeholder="abogado@despacho.legal"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Rol dentro del Despacho
                                        </label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) =>
                                                setInviteRole(e.target.value as 'admin' | 'lawyer' | 'guest')
                                            }
                                            className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                        >
                                            <option value="lawyer">Abogado Asociado (Revisión y Dictámenes)</option>
                                            <option value="admin">Administrador (Gestión de Equipo y Acervo)</option>
                                            <option value="guest">Pasante / Auditor (Solo Lectura y Chat)</option>
                                        </select>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            {inviteRole === 'admin' &&
                                                'Puede invitar miembros, gestionar el acervo del despacho y excepciones comunes.'}
                                            {inviteRole === 'lawyer' &&
                                                'Puede subir documentos, analizar contratos y consultar la biblioteca común.'}
                                            {inviteRole === 'guest' &&
                                                'Pasante / Auditor. Consulta y revisión sin capacidad de exportar dictámenes finales.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isSendingInvite}
                                            onClick={() => setIsInviteOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={isSendingInvite || !inviteEmail.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            {isSendingInvite ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                            ) : null}
                                            Enviar Invitación por Correo
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Modal de Confirmación: Remover Miembro */}
                    <ConfirmModal
                        isOpen={memberToRemove !== null}
                        onClose={() => setMemberToRemove(null)}
                        onConfirm={handleConfirmRemove}
                        title="Remover Miembro del Despacho"
                        description={
                            memberToRemove
                                ? `¿Estás seguro de remover a ${memberToRemove.username} (${memberToRemove.email}) de este despacho? Esta acción no elimina su cuenta global ni sus otros despachos.`
                                : ''
                        }
                        confirmText="Remover Miembro"
                        cancelText="Cancelar"
                        variant="destructive"
                        isLoading={isRemovingMember}
                    />

                    {/* Modal de Confirmación: Revocar Invitación */}
                    <ConfirmModal
                        isOpen={inviteToRevoke !== null}
                        onClose={() => setInviteToRevoke(null)}
                        onConfirm={handleConfirmRevoke}
                        title="Revocar Invitación"
                        description={
                            inviteToRevoke
                                ? `¿Estás seguro de revocar la invitación enviada a ${inviteToRevoke.email}? El enlace enviado por correo dejará de ser válido inmediatamente.`
                                : ''
                        }
                        confirmText="Revocar Invitación"
                        cancelText="Cancelar"
                        variant="destructive"
                        isLoading={isRevokingInvite}
                    />

                    {/* Modal de Confirmación: Cancelar Suscripción Recurrente */}
                    <ConfirmModal
                        isOpen={isCancelModalOpen}
                        onClose={() => setIsCancelModalOpen(false)}
                        onConfirm={handleCancelConfirm}
                        title="Cancelar Suscripción Recurrente"
                        description={
                            billingStatus
                                ? `¿Estás seguro de cancelar tu suscripción a ${getPlanBadge(billingStatus.plan_tier).label}? Tu despacho mantendrá acceso completo hasta el ${
                                      billingStatus.current_period_end
                                          ? new Date(billingStatus.current_period_end).toLocaleDateString('es-MX', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })
                                          : 'final del ciclo actual'
                                  }. Después, pasarás al Plan Gratuito (3 contratos de cortesía) y no se realizará ningún cargo adicional.`
                                : ''
                        }
                        confirmText="Confirmar Cancelación"
                        cancelText="Mantener mi Plan"
                        variant="destructive"
                        isLoading={isCanceling}
                    />
                </div>
            </div>
        </ProtectedRoute>
    );
}
