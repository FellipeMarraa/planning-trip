// src/App.tsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import PageLoader from './components/common/page-loader';

// Lazy: cada rota carrega só o que precisa (evita baixar Recharts/Framer
// Motion de outras páginas antes de mostrar, por exemplo, a de convite).
const Login = lazy(() => import('./pages/Login'));
const Sso = lazy(() => import('@/pages/Sso.tsx'));
const Dashboard = lazy(() => import('@/pages/Dashboard.tsx'));
const TripDetails = lazy(() => import('@/pages/TripDetails.tsx'));
const JoinTrip = lazy(() => import('@/pages/JoinTrip.tsx'));
const TripItineraryPage = lazy(() => import('@/pages/TripItineraryPage.tsx'));

const GlobalAdminPlaceholder = () => (
    <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Painel de administração</h1>
        <p className="text-muted-foreground text-sm">Área reservada para administradores globais.</p>
    </div>
);

const ProtectedRoute = ({ children, roleRequired }: { children: React.ReactNode, roleRequired?: 'GLOBAL' }) => {
    const { user, loading, isGlobalAdmin } = useAuth();
    const location = useLocation();

    if (loading) return <PageLoader />;

    if (!user) {
        // Destino vai na URL (query param), não em sessionStorage/location.state —
        // sobrevive a qualquer combinação de popup/reload/modo privado sem depender
        // de storage do navegador.
        const redirectTo = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?redirect=${redirectTo}`} replace />;
    }

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
    const [searchParams] = useSearchParams();

    if (loading) return null;
    if (user) {
        const redirectTo = searchParams.get('redirect');
        return <Navigate to={redirectTo ? decodeURIComponent(redirectTo) : '/'} replace />;
    }

    return <>{children}</>;
};

export default function App() {
    return (
        <ToastProvider>
        <AuthProvider>
            <Router>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Rota de Login */}
                    <Route path="/login" element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    } />

                    {/* Rota transitória de SSO vindo do CashZ: consome o custom token e redireciona */}
                    <Route path="/sso" element={<Sso />} />

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
                    <Route path="/join/:inviteId" element={
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
                </Suspense>
            </Router>
        </AuthProvider>
        </ToastProvider>
    );
}