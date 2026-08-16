import React, {createContext, useContext, useEffect, useState} from 'react';
import {auth} from '../config/firebase';
import {GoogleAuthProvider, signInWithPopup, signOut, type User} from 'firebase/auth';
import {upsertUserProfile} from '../services/users';
import {useToast} from './ToastContext';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isGlobalAdmin: boolean; // Corrigindo o erro TS2339
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Lista de e-mails que são ADM_GLOBAL (Root)
const GLOBAL_ADMIN_EMAILS = ['fellipemarra.fm@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();

    const isGlobalAdmin = user ? GLOBAL_ADMIN_EMAILS.includes(user.email || '') : false;

    const loginWithGoogle = async () => {
        // Popup em vez de redirect: o redirect quebra em Safari 16.1+/Chrome 115+/
        // Firefox 109+ porque authDomain (firebaseapp.com) é domínio diferente do
        // app (vercel.app) e esses navegadores bloqueiam storage entre domínios
        // durante a ida-e-volta — o usuário volta pro login sem nunca autenticar.
        // Corrigir isso via redirect exigiria domínio customizado + proxy, fora de
        // escopo agora. Popup não depende desse bridge entre domínios.
        // Ainda falha dentro de webviews de apps (WhatsApp, Instagram) — tratado
        // separadamente pelo aviso em Login.tsx (isInAppBrowser).
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            showError("Não foi possível fazer login. Tente novamente.");
        }
    };

    const logout = () => signOut(auth);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
            if (user) {
                upsertUserProfile(user).catch((error) => console.error("Erro ao salvar perfil:", error));
            }
        });
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isGlobalAdmin, loginWithGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
    return context;
};