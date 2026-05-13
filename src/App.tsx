import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/layout/Layout';
import Dashboard from "@/pages/Dashboard.tsx";
import TripDetails from "@/pages/TripDetails.tsx";
import JoinTrip from "@/pages/JoinTrip.tsx"; // Certifique-se de importar a página que criamos

const GlobalAdminPlaceholder = () => (
    <div className="space-y-2">
        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Painel Root</h1>
        <p className="text-slate-400 text-sm">Controle total do ecossistema TripPlanner.</p>
    </div>
);

const ProtectedRoute = ({ children, roleRequired }: { children: React.ReactNode, roleRequired?: 'GLOBAL' }) => {
    const { user, loading, isGlobalAdmin } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    if (roleRequired === 'GLOBAL' && !isGlobalAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) return null;
    if (user) return <Navigate to="/" replace />;

    return <>{children}</>;
};

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Rota de Login */}
                    <Route path="/login" element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    } />

                    {/* Rota Principal: Dashboard */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    {/* ROTA FALTANTE: Detalhes da Viagem */}
                    <Route path="/trip/:tripId" element={
                        <ProtectedRoute>
                            <TripDetails />
                        </ProtectedRoute>
                    } />

                    {/* Rota Administrativa */}
                    <Route path="/admin" element={
                        <ProtectedRoute roleRequired="GLOBAL">
                            <GlobalAdminPlaceholder />
                        </ProtectedRoute>
                    } />

                    <Route path="/join/:tripId/:role" element={
                        <ProtectedRoute>
                            <JoinTrip />
                        </ProtectedRoute>
                    } />

                    {/* Fallback para Dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}