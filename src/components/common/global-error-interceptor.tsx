// src/components/common/global-error-interceptor.tsx
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { reportClientError } from '@/lib/reportClientError';

// Complementa o ErrorBoundary: erro de RENDER é capturado por
// componentDidCatch (só existe como class component), mas erro assíncrono
// (Promise rejeitada sem catch, throw fora do ciclo de render) não passa
// pelo boundary — só window.onerror/onunhandledrejection pegam esses.
export function GlobalErrorInterceptor({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const handleError = (event: ErrorEvent) => {
            reportClientError(event.message, event.error?.stack);
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const message = event.reason?.message || JSON.stringify(event.reason);
            reportClientError(`Promise Rejection: ${message}`, event.reason?.stack);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [user]);

    return <>{children}</>;
}
