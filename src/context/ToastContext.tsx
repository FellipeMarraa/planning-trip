// src/context/ToastContext.tsx
import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'error' | 'success';

interface ToastItem {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastContextType {
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback((message: string, variant: ToastVariant) => {
        const id = nextId++;
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => dismiss(id), 5000);
    }, [dismiss]);

    const showError = useCallback((message: string) => push(message, 'error'), [push]);
    const showSuccess = useCallback((message: string) => push(message, 'success'), [push]);

    return (
        <ToastContext.Provider value={{ showError, showSuccess }}>
            {children}
            <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:max-w-[360px] pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "flex items-start gap-3 p-4 rounded-2xl shadow-lg border animate-in slide-in-from-bottom-2 fade-in pointer-events-auto",
                            toast.variant === 'error'
                                ? "bg-card border-destructive/30 text-destructive"
                                : "bg-card border-chart-2/30 text-chart-2"
                        )}
                    >
                        {toast.variant === 'error'
                            ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                        <p className="text-sm flex-1 text-foreground">{toast.message}</p>
                        <button onClick={() => dismiss(toast.id)} className="flex-shrink-0 text-muted-foreground hover:text-foreground" aria-label="Fechar aviso">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast deve ser usado dentro de um ToastProvider");
    return context;
}
