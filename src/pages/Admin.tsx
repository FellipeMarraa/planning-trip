// src/pages/Admin.tsx
import { useEffect, useState } from 'react';
import { collection, getCountFromServer, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/context/ToastContext';
import { clearClientLogs } from '@/services/adminLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertCircle, LayoutDashboard, Loader2, MapPin, ShieldAlert, Trash2, Users } from 'lucide-react';

interface ClientLog {
    id: string;
    error: string;
    stack?: string;
    userEmail?: string | null;
    url?: string;
    createdAt?: { toDate: () => Date } | null;
}

function OverviewTab() {
    const [tripCount, setTripCount] = useState<number | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);

    useEffect(() => {
        // getCountFromServer: conta sem baixar os documentos — barato no
        // Spark, mesmo padrão do AdminHeader do CashZ. Leitura única (não
        // onSnapshot), não precisa ser tempo real pra uma métrica de painel.
        getCountFromServer(collection(db, 'trips')).then((snap) => setTripCount(snap.data().count));
        getCountFromServer(collection(db, 'users')).then((snap) => setUserCount(snap.data().count));
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Viagens criadas</CardTitle>
                    <MapPin className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-semibold text-foreground">
                        {tripCount === null ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : tripCount}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Usuários com perfil</CardTitle>
                    <Users className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-semibold text-foreground">
                        {userCount === null ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : userCount}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function ErrorLogsTab() {
    const { showError, showSuccess } = useToast();
    const [logs, setLogs] = useState<ClientLog[]>([]);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'client_logs'), orderBy('createdAt', 'desc'), limit(30));
        const unsubscribe = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientLog)));
        }, (err) => {
            console.error('Erro ao observar client_logs:', err);
        });
        return () => unsubscribe();
    }, []);

    const handleClear = async () => {
        setClearing(true);
        try {
            await clearClientLogs(logs.map((log) => log.id));
            showSuccess('Logs apagados.');
        } catch (err) {
            console.error('Erro ao apagar logs:', err);
            showError('Não foi possível apagar os logs.');
        } finally {
            setClearing(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" /> Erros reportados
                </CardTitle>
                {logs.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClear} disabled={clearing} className="text-destructive hover:text-destructive">
                        {clearing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                        Limpar
                    </Button>
                )}
            </CardHeader>
            <CardContent className="px-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Erro</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                                    Nenhum erro registrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('pt-BR') : '—'}
                                    </TableCell>
                                    <TableCell className="text-xs max-w-[140px] truncate">{log.userEmail || 'Desconhecido'}</TableCell>
                                    <TableCell className="text-xs max-w-[320px]">
                                        <p className="text-destructive font-medium break-words">{log.error}</p>
                                        {log.url && <p className="text-muted-foreground/70 truncate mt-0.5">{log.url}</p>}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function Admin() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" /> Painel de administração
            </h1>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview" className="gap-2">
                        <LayoutDashboard className="w-3.5 h-3.5" /> Visão geral
                    </TabsTrigger>
                    <TabsTrigger value="errors" className="gap-2">
                        <AlertCircle className="w-3.5 h-3.5" /> Erros
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <OverviewTab />
                </TabsContent>
                <TabsContent value="errors" className="mt-4">
                    <ErrorLogsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
