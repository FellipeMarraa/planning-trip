// src/components/layout/Layout.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Plane, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, logout, isGlobalAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 selection:bg-indigo-500/30 font-sans">
            {/* Top Navigation - Estilo Soft Slate com Glassmorphism */}
            <nav className="sticky top-0 z-50 w-full border-b border-slate-800/50 bg-[#0f172a]/80 backdrop-blur-md">
                <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Logo Area */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-indigo-500/50 transition-all shadow-lg">
                            <Plane className="w-5 h-5 text-indigo-400 -rotate-45" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="font-black text-sm tracking-tighter uppercase italic">
                                TripPlanner <span className="text-indigo-500 text-xs">AI</span>
                            </span>
                            <span className="text-[8px] text-slate-500 font-bold tracking-[0.2em] uppercase">Premium</span>
                        </div>
                    </Link>

                    {/* Actions Area */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {isGlobalAdmin && (
                            <Link to="/admin">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}

                        <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

                        <div className="flex items-center gap-3">
                            {/* User Info (Desktop) */}
                            <div className="text-right hidden md:block">
                                <p className="text-[11px] font-bold text-slate-200 leading-none">
                                    {user?.displayName || 'Viajante'}
                                </p>
                                <p className="text-[9px] text-slate-500 font-medium tracking-tight">
                                    {user?.email}
                                </p>
                            </div>

                            {/* User Avatar com Correção de Foto */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                                <div className="relative w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                                    {user?.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <UserIcon className="w-4 h-4 text-slate-500" />
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content - Centralizado e Responsivo */}
            <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-in fade-in slide-in-from-top-1 duration-700">
                {children}
            </main>
        </div>
    );
}