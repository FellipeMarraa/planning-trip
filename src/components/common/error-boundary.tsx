// src/components/common/error-boundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/reportClientError';

const CHUNK_LOAD_ERROR_PATTERN = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

// Sobrevive a um reload (não a um F5 manual do usuário) pra distinguir "essa
// aba tentou recarregar uma vez" de "a próxima navegação nesta sessão".
export const CHUNK_RELOAD_FLAG = 'plt_chunk_reload_attempted';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Erro não tratado na árvore de componentes:', error, info);

        // Deploys trocam o hash dos chunks lazy-loaded — uma aba aberta de
        // antes do deploy busca um chunk que não existe mais e a import()
        // dinâmica falha. Sem isso, o usuário via tela branca e só resolvia
        // fechando e reabrindo o site (só um reload completo busca o
        // index.html novo, com os hashes certos). Recarrega automaticamente
        // UMA vez; a flag evita loop se o erro for outra coisa.
        if (CHUNK_LOAD_ERROR_PATTERN.test(error.message)) {
            if (!sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
                sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
                window.location.reload();
            }
            // Não reporta: é um efeito conhecido e autocorrigido de deploy,
            // reportaria a mesma coisa toda vez que alguém tivesse uma aba
            // aberta na hora de um deploy — ruído, não sinal.
            return;
        }

        reportClientError(`Render error: ${error.message}`, error.stack || info.componentStack || undefined);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background px-6">
                    <div className="max-w-md text-center space-y-4">
                        <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6 text-destructive" />
                        </div>
                        <p className="text-foreground font-medium">Algo deu errado.</p>
                        <p className="text-sm text-muted-foreground">
                            Tente recarregar a página. Se o problema continuar, entre em contato.
                        </p>
                        <Button onClick={() => window.location.reload()}>Recarregar</Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
