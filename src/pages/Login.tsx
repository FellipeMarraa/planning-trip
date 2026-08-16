// src/pages/Login.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { LogIn, Plane, ScrollText, ShieldCheck, X } from "lucide-react";

export default function Login() {
    const { loginWithGoogle } = useAuth();
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    return (
        <div className="h-screen w-full bg-background flex items-center justify-center p-6 relative overflow-hidden text-foreground font-sans">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-primary/15 blur-[110px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-chart-2/15 blur-[110px] rounded-full" />
            </div>

            <div className="w-full max-w-[400px] z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                        <Plane className="w-6 h-6 text-primary-foreground -rotate-45" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        TripPlanner
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1.5">
                        Organize viagens em grupo sem complicação.
                    </p>
                </div>

                <div className="w-full bg-card border border-border shadow-xl rounded-3xl p-8 space-y-6">
                    <div className="space-y-1 text-center">
                        <h2 className="text-lg font-semibold text-foreground">Bem-vindo de volta</h2>
                        <p className="text-muted-foreground text-sm">Entre para acessar suas viagens</p>
                    </div>

                    <Button
                        variant="default"
                        className="w-full h-12 font-medium gap-3 rounded-xl shadow-sm"
                        onClick={loginWithGoogle}
                    >
                        <LogIn className="w-4 h-4" />
                        Continuar com Google
                    </Button>

                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        Ao entrar, você concorda com nossos{' '}
                        <button className="text-primary hover:underline">termos</button> e{' '}
                        <button className="text-primary hover:underline">política de privacidade</button>.
                    </p>

                    <AlertDialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
                        <AlertDialogTrigger asChild>
                            <button className="w-full text-muted-foreground hover:text-primary text-xs font-medium transition-colors flex items-center justify-center gap-2">
                                <ScrollText className="w-3.5 h-3.5" />
                                Ver detalhes de privacidade
                            </button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className="max-w-[440px] rounded-3xl p-0 overflow-hidden">
                            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5 text-primary" />
                                    </div>
                                    <AlertDialogTitle className="text-base font-semibold text-foreground">Privacidade & Termos</AlertDialogTitle>
                                </div>
                                <AlertDialogCancel className="h-8 w-8 p-0 border-0 bg-transparent hover:bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                                    <X className="w-4 h-4" />
                                </AlertDialogCancel>
                            </div>

                            <div className="p-8 max-h-[350px] overflow-y-auto scrollbar-none space-y-5 text-sm text-muted-foreground leading-relaxed">
                                <section className="space-y-1">
                                    <h4 className="font-semibold text-foreground">Login com Google</h4>
                                    <p>Usamos o Google Auth para autenticação. Coletamos apenas nome e foto para personalizar sua conta.</p>
                                </section>
                                <section className="space-y-1">
                                    <h4 className="font-semibold text-foreground">Gestão financeira</h4>
                                    <p>As conversões de moeda usam cotações de mercado em tempo real. Seus dados de viagem são privados e visíveis só para participantes convidados.</p>
                                </section>
                            </div>

                            <div className="p-6 border-t border-border bg-muted/40">
                                <AlertDialogAction className="w-full" onClick={() => setIsTermsOpen(false)}>
                                    Entendido
                                </AlertDialogAction>
                            </div>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <footer className="mt-10 text-center">
                    <p className="text-xs text-muted-foreground/70">
                        &copy; 2026 TripPlanner
                    </p>
                </footer>
            </div>
        </div>
    );
}
