import React, {createContext, useContext, useEffect, useState} from 'react';
import {auth} from '../config/firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    fetchSignInMethodsForEmail,
    updateProfile,
    type User,
} from 'firebase/auth';
import {upsertUserProfile} from '../services/users';
import {useToast} from './ToastContext';
import PageLoader from '../components/common/page-loader';
import {syncPlanFromCashz} from '../lib/planSync';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isGlobalAdmin: boolean; // Corrigindo o erro TS2339
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Lista de e-mails que são ADM_GLOBAL (Root)
const GLOBAL_ADMIN_EMAILS = ['fellipemarra.fm@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError, showSuccess } = useToast();

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

    const loginWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            showError("E-mail ou senha incorretos.");
        }
    };

    const register = async (email: string, password: string, name: string) => {
        try {
            // Mesma dupla checagem do CashZ (firebase.ts register()): sem
            // isso, alguém registrando por e-mail/senha um endereço que já
            // tem conta Google criaria uma SEGUNDA conta com o mesmo e-mail
            // e uid diferente — plano/dado divergem entre as duas (foi
            // exatamente esse tipo de confusão, entre CashZ e planning-trip,
            // que motivou adicionar login por e-mail/senha aqui).
            // fetchSignInMethodsForEmail pode voltar vazio se "Email
            // Enumeration Protection" estiver ativo no projeto (config do
            // Firebase, não controlável daqui) — por isso o catch abaixo
            // trata auth/email-already-in-use como segunda camada, que
            // funciona sempre.
            const existingMethods = await fetchSignInMethodsForEmail(auth, email);
            if (existingMethods.length > 0 && !existingMethods.includes('password')) {
                showError("Este e-mail já tem uma conta via Google. Entre com Google em vez de criar uma conta nova.");
                return;
            }

            const credential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) {
                await updateProfile(credential.user, { displayName: name });
            }

            try {
                await sendEmailVerification(credential.user);
            } catch (verificationError) {
                // Conta já foi criada com sucesso — não bloqueia o cadastro
                // por falha no envio do e-mail de verificação.
                console.error("Erro ao enviar e-mail de verificação:", verificationError);
            }

            showSuccess("Conta criada! Verifique seu e-mail pra confirmar.");
        } catch (error) {
            const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            const message = code === 'auth/email-already-in-use'
                ? "Este e-mail já tem uma conta (Google ou e-mail/senha). Tente entrar em vez de criar uma conta nova."
                : "Não foi possível criar a conta. Tente novamente.";
            console.error("Erro ao registrar:", error);
            showError(message);
        }
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
            showSuccess("E-mail de redefinição enviado. Verifique sua caixa de entrada.");
        } catch (error) {
            console.error("Erro ao enviar redefinição de senha:", error);
            showError("Não foi possível enviar o e-mail. Confira o endereço digitado.");
        }
    };

    const logout = () => signOut(auth);

    // `updateProfile`/`updateEmail` mutam auth.currentUser sem disparar
    // onAuthStateChanged — sem isso, o resto do app (ex.: nome no header do
    // Layout) só veria a mudança no próximo login. `reload()` + novo objeto
    // no state força o re-render em quem lê `user` do contexto.
    const refreshUser = async () => {
        if (!auth.currentUser) return;
        await auth.currentUser.reload();
        // Novo objeto (mesmo protótipo, então getIdToken/etc continuam
        // funcionando) só pra dar uma referência nova ao React — reload()
        // muta auth.currentUser no lugar, sem isso o state não re-renderiza.
        setUser(Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser));
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
            if (user) {
                upsertUserProfile(user).catch((error) => console.error("Erro ao salvar perfil:", error));
                // Sincroniza plano em paralelo, sem bloquear o carregamento —
                // cobre quem loga direto (sem passar pelo SSO do CashZ).
                syncPlanFromCashz(user);
            }
        });
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isGlobalAdmin, loginWithGoogle, loginWithEmail, register, resetPassword, logout, refreshUser }}>
            {loading ? <PageLoader /> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
    return context;
};