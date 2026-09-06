// src/pages/WalletPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserTrips } from '@/hooks/useUserTrips';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { useCurrencyLots } from '@/hooks/useCurrencyLots';
import { useWalletExpenses } from '@/hooks/useWalletExpenses';
import { useWalletShares } from '@/hooks/useWalletShares';
import { summarizeWalletDemand } from '@/lib/currencyWallet';
import { computeMutualPartnersByTrip } from '@/lib/walletShares';
import { deleteCurrencyLot } from '@/services/currencyLots';
import { declareWalletShare, revokeWalletShare } from '@/services/walletShares';
import { getMemberName, isGhostUid } from '@/lib/members';
import { CurrencyLotForm } from '@/components/trip/CurrencyLotForm';
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/common/page-loader";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Users, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurrencyLot, Trip, UserProfile } from '@/types';

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

function CurrencySummaryCard({ summary, currency, lots, trip, profiles, onDeleteLot }: {
    summary: ReturnType<typeof summarizeWalletDemand>[number];
    currency: string;
    lots: CurrencyLot[];
    trip: Trip;
    profiles: Record<string, UserProfile>;
    onDeleteLot: (lotId: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const covered = summary.shortfall === 0;
    const isShared = summary.purchasedByOwner.length > 1;

    return (
        <div className="border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{currency}</span>
                <div className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
                    covered ? "bg-chart-2/15 text-chart-2" : "bg-amber-500/15 text-amber-600"
                )}>
                    {covered ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {covered ? "Coberto" : `Faltam ${formatCurrency(summary.shortfall, currency)}`}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                    <p className="text-muted-foreground">Comprado</p>
                    <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(summary.totalPurchased, currency)}</p>
                    {isShared && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {summary.purchasedByOwner.map((c) => `${getMemberName(c.ownerUid, trip, profiles)}: ${formatCurrency(c.amount, currency)}`).join(' · ')}
                        </p>
                    )}
                </div>
                <div>
                    <p className="text-muted-foreground">Necessário</p>
                    <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(summary.totalNeeded, currency)}</p>
                </div>
            </div>

            {summary.items.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expanded ? "Ocultar" : "Ver"} despesas ({summary.items.length})
                    </button>
                    {expanded && (
                        <ul className="mt-2 space-y-1">
                            {summary.items.map((item) => (
                                <li key={item.expenseId} className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="truncate">{item.description}</span>
                                    <span className="tabular-nums shrink-0 ml-2">{formatCurrency(item.amountNeeded, currency)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {lots.length > 0 && (
                <div className="pt-2 border-t border-border space-y-1">
                    {lots.map((lot) => (
                        <div key={lot.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                {isShared && `${getMemberName(lot.ownerUid, trip, profiles)} — `}
                                {formatCurrency(lot.amountPurchased, currency)} a R$ {lot.ratePaidBRL.toFixed(4)} ({lot.purchaseDate})
                            </span>
                            <button
                                type="button"
                                onClick={() => onDeleteLot(lot.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Remover compra"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ShareControl({ trip, myUid, profiles, declaredByMe, declaredToMe, onDeclare, onRevoke }: {
    trip: Trip;
    myUid: string;
    profiles: Record<string, UserProfile>;
    declaredByMe: Set<string>;
    declaredToMe: Set<string>;
    onDeclare: (toUid: string) => void;
    onRevoke: (toUid: string) => void;
}) {
    const otherRealParticipants = (trip.participants || []).filter((uid) => uid !== myUid && !isGhostUid(uid));
    if (otherRealParticipants.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {otherRealParticipants.map((uid) => {
                const iDeclared = declaredByMe.has(uid);
                const theyDeclared = declaredToMe.has(uid);
                const mutual = iDeclared && theyDeclared;
                const name = getMemberName(uid, trip, profiles);

                return (
                    <button
                        key={uid}
                        type="button"
                        onClick={() => (iDeclared ? onRevoke(uid) : onDeclare(uid))}
                        className={cn(
                            "flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                            mutual
                                ? "bg-chart-2/15 border-chart-2/40 text-chart-2"
                                : iDeclared
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
                                    : "bg-muted/50 border-border text-muted-foreground"
                        )}
                    >
                        {mutual ? <Users className="w-3 h-3" /> : iDeclared ? <X className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {mutual ? `Compartilhado com ${name}` : iDeclared ? `Aguardando ${name}` : `Compartilhar com ${name}`}
                    </button>
                );
            })}
        </div>
    );
}

export default function WalletPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { trips, loading: tripsLoading } = useUserTrips();
    const { declaredByMe, declaredToMe } = useWalletShares();
    const [lotFormTripId, setLotFormTripId] = useState<string | null>(null);

    // Carteira só faz sentido pra viagem com moeda de referência estrangeira
    // — viagem BRL não tem conceito de "comprar moeda antes", mesmo que
    // alguma despesa avulsa tenha sido lançada noutra moeda por engano.
    const nonBrlTrips = useMemo(() => trips.filter((t) => t.baseCurrency !== 'BRL'), [trips]);

    // Bloqueia acesso de verdade (não só esconde o item do menu, ver
    // Layout.tsx) — sem nenhuma viagem em moeda estrangeira, a rota /wallet
    // não é navegável nem por URL direta.
    useEffect(() => {
        if (!tripsLoading && nonBrlTrips.length === 0) navigate('/');
    }, [tripsLoading, nonBrlTrips.length, navigate]);

    const mutualPartnersByTrip = useMemo(
        () => computeMutualPartnersByTrip(declaredByMe, declaredToMe),
        [declaredByMe, declaredToMe]
    );

    // Pool de busca: eu + todo parceiro mútuo de qualquer viagem, achatado
    // numa lista só (mesmo espírito "busca tudo de uma vez, agrupa no
    // componente" já usado por useCurrencyLots/useWalletExpenses).
    const fetchUids = useMemo(() => {
        const uids = new Set<string>();
        if (user) uids.add(user.uid);
        Object.values(mutualPartnersByTrip).forEach((partners) => partners.forEach((uid) => uids.add(uid)));
        return Array.from(uids);
    }, [user, mutualPartnersByTrip]);

    const { lots } = useCurrencyLots(fetchUids);
    const { expenses } = useWalletExpenses(fetchUids);

    const allParticipantUids = useMemo(() => {
        const uids = new Set<string>();
        nonBrlTrips.forEach((t) => (t.participants || []).forEach((uid) => { if (!isGhostUid(uid)) uids.add(uid); }));
        return Array.from(uids);
    }, [nonBrlTrips]);
    const { profiles } = useUserProfiles(allParticipantUids);

    const tripSections = useMemo(() => {
        return nonBrlTrips.map((trip) => {
            const partners = mutualPartnersByTrip[trip.id] || [];
            const poolUids = user ? [user.uid, ...partners] : partners;

            const tripLots = lots.filter((l) => l.tripId === trip.id && poolUids.includes(l.ownerUid));
            const tripExpenses = expenses.filter((e) => e.tripId === trip.id && e.participants.some((p) => poolUids.includes(p)));
            const summaries = summarizeWalletDemand(tripLots, tripExpenses, poolUids);
            return { trip, tripLots, summaries };
        });
    }, [nonBrlTrips, mutualPartnersByTrip, lots, expenses, user]);

    const handleDeleteLot = async (lotId: string) => {
        try {
            await deleteCurrencyLot(lotId);
        } catch (error) {
            console.error('Erro ao remover compra de câmbio:', error);
        }
    };

    const handleDeclare = async (tripId: string, toUid: string) => {
        if (!user) return;
        try {
            await declareWalletShare(tripId, user.uid, toUid);
        } catch (error) {
            console.error('Erro ao declarar compartilhamento de carteira:', error);
        }
    };

    const handleRevoke = async (tripId: string, toUid: string) => {
        if (!user) return;
        try {
            await revokeWalletShare(tripId, user.uid, toUid);
        } catch (error) {
            console.error('Erro ao revogar compartilhamento de carteira:', error);
        }
    };

    // Guarda de acesso vem depois de todos os hooks (nunca antes — early
    // return antes de chamar hook quebraria as Rules of Hooks). Enquanto
    // carrega ou não há viagem em moeda estrangeira, o efeito acima já
    // redireciona pra "/" — aqui só evita desenhar a página por um instante.
    if (tripsLoading || nonBrlTrips.length === 0) return <PageLoader />;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" /> Carteira de câmbio
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Planejamento pessoal — quanto você já comprou de cada moeda vs. quanto a sua cota nas despesas em moeda estrangeira precisa. Não afeta a divisão de gastos com o grupo.
                </p>
            </div>

            {tripSections.map(({ trip, tripLots, summaries }) => {
                    const declaredByMeSet = new Set(declaredByMe.filter((d) => d.tripId === trip.id).map((d) => d.toUid));
                    const declaredToMeSet = new Set(declaredToMe.filter((d) => d.tripId === trip.id).map((d) => d.fromUid));

                    return (
                        <div key={trip.id} className="bg-card border border-border rounded-3xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-foreground">{trip.name}</h2>
                                <Button size="sm" variant="outline" onClick={() => setLotFormTripId(trip.id)}>
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Registrar compra
                                </Button>
                            </div>

                            {user && (
                                <ShareControl
                                    trip={trip}
                                    myUid={user.uid}
                                    profiles={profiles}
                                    declaredByMe={declaredByMeSet}
                                    declaredToMe={declaredToMeSet}
                                    onDeclare={(toUid) => handleDeclare(trip.id, toUid)}
                                    onRevoke={(toUid) => handleRevoke(trip.id, toUid)}
                                />
                            )}

                            {summaries.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Nenhuma compra registrada ainda pra essa viagem.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {summaries.map((summary) => (
                                        <CurrencySummaryCard
                                            key={summary.currency}
                                            summary={summary}
                                            currency={summary.currency}
                                            lots={tripLots.filter((l) => l.currency === summary.currency)}
                                            trip={trip}
                                            profiles={profiles}
                                            onDeleteLot={handleDeleteLot}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

            {user && (
                <CurrencyLotForm
                    open={!!lotFormTripId}
                    onOpenChange={(open) => !open && setLotFormTripId(null)}
                    tripId={lotFormTripId || ''}
                    ownerUid={user.uid}
                    ownerLabel="você"
                />
            )}
        </div>
    );
}
