import { useEffect, useRef, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/config/firebase';

export default function Sso() {
    const navigate = useNavigate();
    const [error, setError] = useState(false);
    const ranRef = useRef(false);

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
        const token = new URLSearchParams(hash).get('token');

        // Remove o token do histórico do navegador assim que lido, antes de tentar usá-lo.
        window.history.replaceState(null, '', '/sso');

        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        signInWithCustomToken(auth, token)
            .then(() => navigate('/', { replace: true }))
            .catch((err) => {
                console.error('Erro ao autenticar via SSO:', err);
                setError(true);
            });
    }, [navigate]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            {error ? (
                <div className="text-center space-y-3">
                    <p className="text-foreground">Não foi possível entrar automaticamente.</p>
                    <a href="/login" className="text-primary underline">Ir para o login</a>
                </div>
            ) : (
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
        </div>
    );
}
