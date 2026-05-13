import React, {createContext, useContext, useEffect, useState} from 'react';
import {auth} from '../config/firebase';
import {GoogleAuthProvider, signInWithPopup, signOut, type User} from 'firebase/auth';

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

    const isGlobalAdmin = user ? GLOBAL_ADMIN_EMAILS.includes(user.email || '') : false;

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro ao fazer login:", error);
        }
    };

    const logout = () => signOut(auth);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
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