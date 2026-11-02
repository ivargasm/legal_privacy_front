"use client";

import { useState } from "react";
import {
    ShieldCheck,
    Search,
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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../store/Store";
import { useDocumentStore } from "../store/documentStore";
import { Button } from "@/components/ui/button";

export default function Navbar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const { userAuth, user, logout } = useAuthStore();
    const { status } = useDocumentStore();
    const [darkMode, setDarkMode] = useState(false);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        if (darkMode) {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
        }
    };

    const isStudio = pathname === "/studio";
    const isLibrary = pathname === "/library";
    const isDocumentActive = status === "reviewing" || status === "analyzing";

    return (
        <header className="fixed top-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
                {/* Brand & Zero-Trust Trust Anchor */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link href="/studio" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">
                            Legal Privacy
                        </span>
                    </Link>

                    <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Procesamiento 100% Local (Zero-Trust)</span>
                    </div>
                </div>

                {/* Center Navigation Tabs */}
                {userAuth && (
                    <nav className="hidden md:flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <Link
                            href="/studio"
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isStudio && !isDocumentActive
                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Documentos</span>
                        </Link>

                        <Link
                            href="/studio"
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isStudio && isDocumentActive
                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Estudio Jurídico</span>
                            {isDocumentActive && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                            )}
                        </Link>

                        <Link
                            href="/library"
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isLibrary
                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Biblioteca Pública</span>
                        </Link>
                    </nav>
                )}

                {/* Right Controls: Law Firm, Search, User Profile, Theme */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {userAuth ? (
                        <>
                            {/* Despacho Badge */}
                            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Villarreal Abogados</span>
                            </div>

                            {/* Search shortcut button */}
                            <button
                                type="button"
                                className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:text-slate-600 hover:border-slate-300 transition-colors"
                            >
                                <Search className="w-3.5 h-3.5 text-slate-400" />
                                <span>Buscar...</span>
                                <kbd className="px-1 py-0.2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-mono text-slate-500">
                                    ⌘K
                                </kbd>
                            </button>

                            {/* User Avatar & Info */}
                            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-xs border border-slate-300/80">
                                    {user?.username ? user.username.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                                </div>
                                <div className="hidden sm:flex flex-col text-left leading-tight">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                                        {user?.username || "Abogado"}
                                    </span>
                                    <span className="text-[10px] text-slate-500 capitalize">
                                        {user?.role === "admin" ? "Socio / Admin" : "Socio / Abogado"}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={logout}
                                    title="Cerrar sesión"
                                    className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-medium">
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
                        className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>

                    {/* Mobile Menu Trigger */}
                    <button
                        className="md:hidden text-slate-700 dark:text-slate-300 p-1"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown */}
            {menuOpen && (
                <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-2 animate-in slide-in-from-top duration-150">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs text-emerald-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Procesamiento 100% Local (Zero-Trust)</span>
                    </div>
                    {userAuth ? (
                        <>
                            <Link
                                href="/studio"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-sm text-slate-700 dark:text-slate-300"
                            >
                                <FolderOpen size={16} /> Documentos
                            </Link>
                            <Link
                                href="/library"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 py-2 text-sm text-slate-700 dark:text-slate-300"
                            >
                                <BookOpen size={16} /> Biblioteca Pública
                            </Link>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-2 py-2 text-sm text-red-600"
                            >
                                <LogOut size={16} /> Cerrar Sesión
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/auth/login"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 py-2 text-sm text-indigo-600"
                        >
                            <LogIn size={16} /> Iniciar Sesión
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
}
