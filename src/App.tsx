// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/layout/Layout';
import Dashboard from "@/pages/Dashboard.tsx";
import TripDetails from "@/pages/TripDetails.tsx";
import JoinTrip from "@/pages/JoinTrip.tsx";
import TripItineraryPage from "@/pages/TripItineraryPage.tsx"; // Nova importação

const GlobalAdminPlaceholder = () => (
    <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Painel de administração</h1>
        <p className="text-muted-foreground text-sm">Área reservada para administradores globais.</p>
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

    // A página de itinerário tem layout próprio (Dark Mode imersivo),
    // então verificamos se devemos renderizar com ou sem o Layout padrão.
    const isItinerary = window.location.pathname.includes('/itinerary');

    return isItinerary ? <>{children}</> : <Layout>{children}</Layout>;
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

                    {/* Detalhes da Viagem (Financeiro) */}
                    <Route path="/trip/:tripId" element={
                        <ProtectedRoute>
                            <TripDetails />
                        </ProtectedRoute>
                    } />

                    {/* ROTA IMERSIVA: Itinerário da Viagem */}
                    <Route path="/trip/:tripId/itinerary" element={
                        <ProtectedRoute>
                            <TripItineraryPage />
                        </ProtectedRoute>
                    } />

                    {/* Rota de Convite */}
                    <Route path="/join/:tripId/:role" element={
                        <ProtectedRoute>
                            <JoinTrip />
                        </ProtectedRoute>
                    } />

                    {/* Rota Administrativa */}
                    <Route path="/admin" element={
                        <ProtectedRoute roleRequired="GLOBAL">
                            <GlobalAdminPlaceholder />
                        </ProtectedRoute>
                    } />

                    {/* Fallback para Dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}