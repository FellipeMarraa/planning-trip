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
        <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans selection:bg-blue-100">
            {/* Top Navigation - Off-white com Blur */}
            <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/70 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200 transition-transform active:scale-95">
                            <Plane className="w-5 h-5 text-white -rotate-45" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="font-semibold text-base tracking-tight text-slate-900">
                                TripPlanner <span className="text-blue-600 font-medium italic">AI</span>
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold tracking-[0.1em] uppercase">Premium Access</span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-3 md:gap-5">
                        {isGlobalAdmin && (
                            <Link to="/admin">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <p className="text-xs font-semibold text-slate-800 leading-none">{user?.displayName}</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1 italic uppercase tracking-tighter">{user?.email}</p>
                            </div>

                            <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                        <UserIcon className="w-4 h-4 text-slate-300" />
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-10 animate-in fade-in duration-700">
                {children}
            </main>
        </div>
    );
}