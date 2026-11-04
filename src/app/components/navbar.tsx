"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ShieldCheck,
    Building2,
    FolderOpen,
    FileText,
    BookOpen,
    LogOut,
    LogIn,
    Sun,
    Moon,
    Menu,
    X,
    User as UserIcon,
    Users,
    ChevronDown,
    Plus,
    Check,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../store/Store";
import { useDocumentStore } from "../store/documentStore";
import { useOrgStore } from "../store/orgStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Navbar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const { userAuth, user, logout } = useAuthStore();
    const { status } = useDocumentStore();
    const { organizations, activeOrg, loadOrganizations, switchActiveOrg, createNewOrg } = useOrgStore();
    const [darkMode, setDarkMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Dropdown & Modal de Despacho
    const [orgMenuOpen, setOrgMenuOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgTaxId, setNewOrgTaxId] = useState("");
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);
    const orgMenuRef = useRef<HTMLDivElement>(null);

    // Solo los usuarios que NO son dueños de ningún despacho pueden crear uno nuevo
    const isAlreadyOwner = organizations.some((o) => o.current_user_role === "owner");

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (userAuth) {
            loadOrganizations();
        }
    }, [userAuth, loadOrganizations]);

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
                setOrgMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        if (darkMode) {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
        }
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;
        setIsCreatingOrg(true);
        try {
            const created = await createNewOrg(newOrgName.trim(), newOrgTaxId.trim() || undefined);
            toast.success(`Despacho "${created.name}" creado exitosamente`);
            setCreateModalOpen(false);
            setNewOrgName("");
            setNewOrgTaxId("");
            setOrgMenuOpen(false);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error creando despacho";
            toast.error(msg);
        } finally {
            setIsCreatingOrg(false);
        }
    };

    const isStudio = pathname === "/studio";
    const isLibrary = pathname === "/library";
    const isOrg = pathname === "/organization";
    const isDocumentActive = status === "reviewing" || status === "analyzing";

    const getRoleBadge = (role?: string) => {
        switch (role) {
            case "owner":
                return "Socio Director";
            case "admin":
                return "Administrador";
            case "lawyer":
                return "Abogado";
            case "guest":
                return "Pasante";
            default:
                return "Miembro";
        }
    };

    return (
        <header className="fixed top-0 left-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
                {/* Brand & Zero-Trust Trust Anchor */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link href="/studio" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs group-hover:bg-primary/90 transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-base tracking-tight text-foreground">
                            Legal Privacy
                        </span>
                    </Link>

                    <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Procesamiento 100% Local (Zero-Trust)</span>
                    </div>
                </div>

                {/* Center Navigation Tabs */}
                {userAuth && (
                    <nav className="hidden md:flex items-center p-1 rounded-xl bg-muted/80 border border-border">
                        <Link
                            href="/studio"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isStudio && !isDocumentActive
                                    ? "bg-card text-foreground shadow-xs font-semibold border border-border/60"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Documentos</span>
                        </Link>

                        <Link
                            href="/studio"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isStudio && isDocumentActive
                                    ? "bg-card text-foreground shadow-xs font-semibold border border-border/60"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Estudio Jurídico</span>
                            {isDocumentActive && (
                                <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                        </Link>

                        <Link
                            href="/library"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isLibrary
                                    ? "bg-card text-foreground shadow-xs font-semibold border border-border/60"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Biblioteca</span>
                        </Link>

                        <Link
                            href="/organization"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isOrg
                                    ? "bg-card text-foreground shadow-xs font-semibold border border-border/60"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Equipo</span>
                        </Link>
                    </nav>
                )}

                {/* Right Controls: Despacho Selector, User Profile, Theme */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {userAuth ? (
                        <>
                            {/* Despacho Switcher Dropdown */}
                            <div className="relative" ref={orgMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setOrgMenuOpen(!orgMenuOpen)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground bg-card border border-border hover:bg-muted transition-colors shadow-xs cursor-pointer"
                                >
                                    <div className="w-5 h-5 rounded-md bg-muted text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                                        <Building2 className="w-3 h-3" />
                                    </div>
                                    <div className="flex flex-col text-left leading-tight max-w-[140px] truncate">
                                        <span className="font-semibold text-xs truncate">
                                            {activeOrg?.name || "Mi Despacho"}
                                        </span>
                                        <span className="text-[10px] text-accent-foreground font-medium">
                                            {getRoleBadge(activeOrg?.current_user_role)}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${orgMenuOpen ? "rotate-180" : ""}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {orgMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                                        <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Mis Despachos
                                        </div>

                                        <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                                            {organizations.map((org) => {
                                                const isCurrent = org.id === activeOrg?.id;
                                                const isSuspended = org.current_user_membership_active === false;

                                                return (
                                                    <button
                                                        key={org.id}
                                                        type="button"
                                                        onClick={() => {
                                                             if (!isCurrent && !isSuspended) {
                                                                switchActiveOrg(org.id);
                                                            }
                                                        }}
                                                        disabled={isSuspended}
                                                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                                                            isCurrent
                                                                ? "bg-accent/30 text-foreground font-semibold"
                                                                : isSuspended
                                                                ? "opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground"
                                                                : "hover:bg-muted text-foreground cursor-pointer"
                                                        }`}
                                                    >
                                                        <div className="flex flex-col truncate pr-2">
                                                            <span className="truncate">{org.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {getRoleBadge(org.current_user_role)}
                                                                {isSuspended && " • (Suspendido)"}
                                                            </span>
                                                        </div>
                                                        {isCurrent && <Check className="w-4 h-4 text-primary shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="border-t border-border mt-2 pt-1.5 px-2 space-y-1">
                                            {!isAlreadyOwner && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOrgMenuOpen(false);
                                                        setCreateModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-muted transition-colors cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Crear mi propio despacho</span>
                                                </button>
                                            )}

                                            <Link
                                                href="/organization"
                                                onClick={() => setOrgMenuOpen(false)}
                                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                <span>Gestionar equipo y roles</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Avatar & Info */}
                            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-border">
                                <div className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center font-semibold text-xs border border-border">
                                    {user?.username ? user.username.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                                </div>
                                <div className="hidden sm:flex flex-col text-left leading-tight">
                                    <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                                        {user?.username || "Abogado"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground capitalize">
                                        {user?.email}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={logout}
                                    title="Cerrar sesión"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg">
                            <Link href="/auth/login" className="flex items-center gap-1.5">
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Iniciar Sesión</span>
                            </Link>
                        </Button>
                    )}

                    {/* Dark Mode Minimal Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleDarkMode}
                        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>

                    {/* Mobile Menu Trigger */}
                    <button
                        className="md:hidden text-foreground p-1"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Modal para Crear Nuevo Despacho (Montado en Portal centrado en pantalla) */}
            {mounted && createModalOpen && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-foreground text-base">
                                    Crear Nuevo Despacho
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Nombre o Razón Social del Despacho *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    placeholder="Ej. González & Asociados S.C."
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Identificación Fiscal / RFC (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={newOrgTaxId}
                                    onChange={(e) => setNewOrgTaxId(e.target.value)}
                                    placeholder="Ej. GAS980214XYZ"
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                                Te registrarás automáticamente como <strong>Socio Director (Owner)</strong> de este despacho con control total sobre el acervo y los miembros.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="text-xs h-9 rounded-lg"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isCreatingOrg || !newOrgName.trim()}
                                    className="text-xs h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                >
                                    {isCreatingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                                    Crear Despacho
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Mobile Dropdown */}
            {menuOpen && (
                <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2 animate-in slide-in-from-top duration-150">
                    <div className="flex items-center gap-2 pb-2 border-b border-border text-xs text-foreground font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Procesamiento 100% Local (Zero-Trust)</span>
                    </div>
                    {userAuth ? (
                        <>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                Despacho Activo: {activeOrg?.name} ({getRoleBadge(activeOrg?.current_user_role)})
                            </div>
                            <Link
                                href="/studio"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary"
                            >
                                <FolderOpen size={16} /> Documentos
                            </Link>
                            <Link
                                href="/library"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary"
                            >
                                <BookOpen size={16} /> Biblioteca
                            </Link>
                            <Link
                                href="/organization"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary"
                            >
                                <Users size={16} /> Equipo y Ajustes
                            </Link>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-2 py-2 text-sm text-destructive"
                            >
                                <LogOut size={16} /> Cerrar Sesión
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/auth/login"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 py-2 text-sm text-primary font-semibold"
                        >
                            <LogIn size={16} /> Iniciar Sesión
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
}
