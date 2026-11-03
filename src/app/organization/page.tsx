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
    Building2,
    Users,
    Mail,
    Trash2,
    UserPlus,
    Edit3,
    Loader2,
    Ban,
    UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { toast } from 'sonner';

export default function OrganizationPage() {
    const { activeOrg, loadOrganizations } = useOrgStore();
    const { user } = useAuthStore();

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

    const currentUserRole = activeOrg?.current_user_role;
    const isOwner = currentUserRole === 'owner';
    const isAdmin = currentUserRole === 'admin';
    const canManageMembers = isOwner || isAdmin;

    const loadData = useCallback(async () => {
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

    useEffect(() => {
        if (activeOrg) {
            setEditName(activeOrg.name);
            setEditTaxId(activeOrg.tax_id || '');
            loadData();
        }
    }, [activeOrg, loadData]);

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
            await loadData();
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
            await loadData();
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
            await loadData();
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
            await loadData();
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
            await loadData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al revocar invitación');
        } finally {
            setIsRevokingInvite(false);
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

    return (
        <ProtectedRoute>
            <div className="w-full min-h-[calc(100vh-3.75rem)] mt-15 py-8 px-4 sm:px-6 bg-[#FAFAFA] dark:bg-slate-950 pb-20">
                <div className="max-w-6xl mx-auto space-y-8">
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
                                Control de miembros, roles jerárquicos (RBAC), invitaciones con enlace único seguro y aislamiento criptográfico multi-tenant.
                            </p>
                        </div>

                        {canManageMembers && (
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
                                    className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                >
                                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                                    Invitar Miembro
                                </Button>
                            </div>
                        )}
                    </div>

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
                                <span className="text-xs text-slate-500 font-medium">Capacidad de Miembros</span>
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
                                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                                        {members.map((member) => {
                                            const isSelf = user?.id === member.user_id;
                                            const isMemberOwner = member.role === 'owner';
                                            const canEditThisMember =
                                                canManageMembers && !isMemberOwner && !isSelf;

                                            return (
                                                <tr
                                                    key={member.id}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                                >
                                                    <td className="py-3.5 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-200/60 dark:border-indigo-800/60">
                                                                {member.username.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                    {member.username}
                                                                    {isSelf && (
                                                                        <span className="text-[10px] font-normal text-slate-400">
                                                                            (Tú)
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                                                        {member.email}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        {canEditThisMember && isOwner ? (
                                                            <select
                                                                value={member.role}
                                                                onChange={(e) =>
                                                                    handleRoleChange(
                                                                        member,
                                                                        e.target.value as
                                                                            | 'admin'
                                                                            | 'lawyer'
                                                                            | 'guest'
                                                                    )
                                                                }
                                                                disabled={actionMemberId === member.user_id}
                                                                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                                            >
                                                                <option value="admin">Administrador</option>
                                                                <option value="lawyer">Abogado Asociado</option>
                                                                <option value="guest">Pasante / Auditor</option>
                                                            </select>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] font-medium border ${getRoleBadgeVariant(
                                                                    member.role
                                                                )}`}
                                                            >
                                                                {getRoleLabel(member.role)}
                                                            </Badge>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        {member.is_active ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Activo
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                Suspendido
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-xs text-slate-500">
                                                        {new Date(member.joined_at).toLocaleDateString(
                                                            'es-MX',
                                                            {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                            }
                                                        )}
                                                    </td>

                                                    {canManageMembers && (
                                                        <td className="py-3.5 px-6 text-right">
                                                            {canEditThisMember && (
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={
                                                                            actionMemberId === member.user_id
                                                                        }
                                                                        onClick={() =>
                                                                            handleStatusToggle(member)
                                                                        }
                                                                        title={
                                                                            member.is_active
                                                                                ? 'Suspender acceso a este despacho'
                                                                                : 'Reactivar acceso'
                                                                        }
                                                                        className={`h-7 px-2 text-xs ${
                                                                            member.is_active
                                                                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                                                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                                        }`}
                                                                    >
                                                                        {member.is_active ? (
                                                                            <>
                                                                                <Ban className="w-3.5 h-3.5 mr-1" />
                                                                                Suspender
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                                                                Reactivar
                                                                            </>
                                                                        )}
                                                                    </Button>

                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={
                                                                            actionMemberId === member.user_id
                                                                        }
                                                                        onClick={() =>
                                                                            setMemberToRemove(member)
                                                                        }
                                                                        title="Remover de este despacho"
                                                                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

                    {/* Invitaciones Pendientes */}
                    {canManageMembers && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-indigo-600" />
                                        <span>Invitaciones Pendientes ({invitations.length})</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Enlaces de acceso únicos enviados por correo vía Resend. Válidos durante 7 días.
                                    </p>
                                </div>
                            </div>

                            {invitations.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
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
                                                <th className="py-3 px-4">Expira</th>
                                                <th className="py-3 px-6 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                                            {invitations.map((inv) => (
                                                <tr
                                                    key={inv.id}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                                >
                                                    <td className="py-3.5 px-6 font-mono text-xs text-slate-800 dark:text-slate-200">
                                                        {inv.email}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[11px] font-medium border ${getRoleBadgeVariant(
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
                                                        {new Date(inv.expires_at).toLocaleDateString(
                                                            'es-MX',
                                                            {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                            }
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setInviteToRevoke(inv)}
                                                            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-7"
                                                        >
                                                            Revocar
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal: Editar Despacho */}
                {isEditOrgOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                                    Editar Información del Despacho
                                </h3>
                            </div>

                            <form onSubmit={handleUpdateOrg} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Nombre Oficial del Despacho
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder="ej. Villarreal & Asociados SC"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Registro Fiscal / RFC (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={editTaxId}
                                        onChange={(e) => setEditTaxId(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                                        placeholder="VAS200115XX9"
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

                {/* Modal: Invitar Miembro */}
                {isInviteOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
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

                            <form onSubmit={handleSendInvite} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder="abogado@despacho.com"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
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
            </div>
        </ProtectedRoute>
    );
}
