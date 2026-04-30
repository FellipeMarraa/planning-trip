// src/pages/Login.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { LogIn, Plane, ScrollText, ShieldCheck, X } from "lucide-react";

export default function Login() {
    const { loginWithGoogle } = useAuth();
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    return (
        <div className="h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden text-slate-900 font-sans">
            {/* Background Minimalista */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-100/40 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-100/40 blur-[100px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54 48L54 60L6 60L6 48' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E")` }} />
            </div>

            <div className="w-full max-w-[400px] z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="mb-10 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center mb-5 ring-4 ring-slate-50">
                        <Plane className="w-6 h-6 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        TripPlanner <span className="text-blue-600">AI</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1.5 font-medium">
                        Gestão inteligente para viajantes exigentes.
                    </p>
                </div>

                <div className="w-full bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] p-8 space-y-7">
                    <div className="space-y-1.5 text-center">
                        <h2 className="text-lg font-semibold text-slate-800">Boas-vindas</h2>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Acesse sua conta</p>
                    </div>

                    <Button
                        variant="default"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 shadow-lg shadow-blue-100 font-semibold gap-3 rounded-xl border-t border-blue-400/20"
                        onClick={loginWithGoogle}
                    >
                        <LogIn className="w-4 h-4 text-blue-100" />
                        Continuar com Google
                    </Button>

                    <div className="pt-1">
                        <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium">
                            Ao entrar, você concorda com nossos <br />
                            <button className="text-blue-600 hover:underline">termos</button> e <button className="text-blue-600 hover:underline">políticas</button>.
                        </p>
                    </div>

                    <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-slate-100"></div>
                        <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest text-slate-300 font-bold">Transparência</span>
                        <div className="flex-grow border-t border-slate-100"></div>
                    </div>

                    <AlertDialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
                        {/* FIX: Adicionado asChild para evitar aninhamento de botões */}
                        <AlertDialogTrigger asChild>
                            <button className="w-full text-slate-400 hover:text-blue-600 text-[11px] font-semibold transition-colors flex items-center justify-center gap-2 group decoration-slate-200 underline-offset-4 hover:underline">
                                <ScrollText className="w-3.5 h-3.5" />
                                Detalhes do contrato de serviço
                            </button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className="bg-white border-slate-200 max-w-[450px] rounded-[24px] shadow-2xl p-0 overflow-hidden border-none ring-1 ring-black/5">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <AlertDialogTitle className="text-base font-bold text-slate-800 tracking-tight">Privacidade & Termos</AlertDialogTitle>
                                </div>
                                <AlertDialogCancel className="h-8 w-8 p-0 border-0 bg-transparent hover:bg-slate-200/50 rounded-full flex items-center justify-center text-slate-400 transition-all">
                                    <X className="w-4 h-4" />
                                </AlertDialogCancel>
                            </div>

                            <div className="p-8 max-h-[350px] overflow-y-auto scrollbar-none space-y-6 text-[13px] text-slate-600 leading-relaxed font-medium">
                                <section className="space-y-1.5">
                                    <h4 className="font-bold text-slate-900">Integração de Dados</h4>
                                    <p>Utilizamos o Google Auth para segurança. Coletamos nome e foto exclusivamente para personalização da interface.</p>
                                </section>
                                <section className="space-y-1.5">
                                    <h4 className="font-bold text-slate-900">Gestão Financeira</h4>
                                    <p>As conversões automáticas utilizam taxas de mercado em tempo real. Os dados são privados e criptografados.</p>
                                </section>
                                <section className="space-y-1.5">
                                    <h4 className="font-bold text-slate-900">IA Groq</h4>
                                    <p>O processamento de roteiros omite dados sensíveis de orçamento para garantir total anonimato financeiro.</p>
                                </section>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                                <AlertDialogAction
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-8 rounded-xl shadow-lg w-full transition-all active:scale-95"
                                    onClick={() => setIsTermsOpen(false)}
                                >
                                    Entendido
                                </AlertDialogAction>
                            </div>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <footer className="mt-12 text-center">
                    <p className="text-[10px] text-slate-300 font-bold tracking-[0.2em] uppercase">
                        &copy; 2026 TRIPPLANNER AI • CORPORATE EDITION
                    </p>
                </footer>
            </div>
        </div>
    );
}