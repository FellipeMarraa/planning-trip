// src/components/layout/Layout.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Plane, LogOut, User as UserIcon, Settings } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';
import { AiAssistantWidget } from '@/ai/components/AiAssistantWidget';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout, isGlobalAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background text-foreground pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm transition-transform group-active:scale-95">
                            <Plane className="w-4 h-4 text-primary-foreground -rotate-45" />
                        </div>
                        <span className="font-semibold text-base tracking-tight text-foreground">
                            Trip<span className="text-primary">Planner</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-3 md:gap-5">
                        {isGlobalAdmin && (
                            <Link to="/admin">
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-xl">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}

                        <div className="h-5 w-px bg-border hidden sm:block" />

                        <div className="flex items-center gap-3">
                            <Link to="/profile" className="flex items-center gap-3 group">
                                <div className="text-right hidden md:block leading-tight">
                                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{user?.displayName}</p>
                                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                                </div>

                                <div className="w-9 h-9 rounded-full border border-border bg-muted overflow-hidden">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </Link>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="text-muted-foreground hover:text-destructive rounded-xl"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-10">
                {children}
            </main>

            <AiAssistantWidget />
        </div>
    );
}
