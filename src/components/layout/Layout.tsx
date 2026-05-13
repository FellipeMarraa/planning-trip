// src/components/layout/Layout.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Plane, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout, isGlobalAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#0b1222] text-slate-300 font-sans selection:bg-blue-500/30">
            {/* Nav com Glassmorphism Dark */}
            <nav className="sticky top-0 z-50 w-full border-b border-white/[0.04] bg-[#0b1222]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                    {/* Logo Refinada */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20 transition-transform active:scale-95">
                            <Plane className="w-4 h-4 text-white -rotate-45" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="font-medium text-[15px] tracking-tight text-white">
                                TripVision <span className="text-blue-500 font-light uppercase text-[10px] ml-1 tracking-[0.2em]">Pro</span>
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-3 md:gap-6">
                        {isGlobalAdmin && (
                            <Link to="/admin">
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}

                        <div className="h-4 w-[1px] bg-white/[0.08] mx-1 hidden sm:block" />

                        <div className="flex items-center gap-4">
                            {/* User Info com tipografia sutil */}
                            <div className="text-right hidden md:block">
                                <p className="text-[11px] font-medium text-slate-200 leading-none">{user?.displayName}</p>
                                <p className="text-[9px] text-slate-500 font-medium mt-1 uppercase tracking-wider">{user?.email?.split('@')[0]}</p>
                            </div>

                            {/* Avatar com borda fina */}
                            <div className="w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.03] overflow-hidden shadow-inner">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-600" />
                                    </div>
                                )}
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

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                {children}
            </main>
        </div>
    );
}