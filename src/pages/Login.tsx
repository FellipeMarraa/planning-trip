// src/pages/Login.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { LegalDialog } from "@/components/common/LegalDialog";
import { LogIn, Plane, ScrollText, ShieldCheck, TriangleAlert } from "lucide-react";
import { isInAppBrowser } from "@/lib/inAppBrowser";
import { TERMS_SECTIONS, PRIVACY_SECTIONS } from "@/lib/legalContent";

export default function Login() {
    const { loginWithGoogle } = useAuth();
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [inAppBrowser] = useState(isInAppBrowser);

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

                    {inAppBrowser ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                            <TriangleAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-destructive leading-relaxed">
                                O login do Google não funciona dentro do navegador do WhatsApp/Instagram.
                                Toque no menu (⋮ ou ···) e escolha <strong>"Abrir no navegador"</strong> para continuar.
                            </p>
                        </div>
                    ) : (
                        <Button
                            variant="default"
                            className="w-full h-12 font-medium gap-3 rounded-xl shadow-sm"
                            onClick={loginWithGoogle}
                        >
                            <LogIn className="w-4 h-4" />
                            Continuar com Google
                        </Button>
                    )}

                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        Ao entrar, você concorda com nossos{' '}
                        <button type="button" onClick={() => setIsTermsOpen(true)} className="text-primary hover:underline">termos</button> e{' '}
                        <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-primary hover:underline">política de privacidade</button>.
                    </p>

                    <button
                        type="button"
                        onClick={() => setIsPrivacyOpen(true)}
                        className="w-full text-muted-foreground hover:text-primary text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <ScrollText className="w-3.5 h-3.5" />
                        Ver detalhes de privacidade
                    </button>

                    <LegalDialog
                        open={isTermsOpen}
                        onOpenChange={setIsTermsOpen}
                        icon={ScrollText}
                        title="Termos de Uso"
                        sections={TERMS_SECTIONS}
                    />
                    <LegalDialog
                        open={isPrivacyOpen}
                        onOpenChange={setIsPrivacyOpen}
                        icon={ShieldCheck}
                        title="Política de Privacidade"
                        sections={PRIVACY_SECTIONS}
                    />
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
