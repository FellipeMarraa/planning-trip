// src/pages/Profile.tsx
import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCashzPlan } from '@/hooks/useCashzPlan';
import { upsertUserProfile } from '@/services/users';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon } from 'lucide-react';

const PLAN_LABEL: Record<string, string> = {
    premium: 'Premium',
    annual: 'Anual',
};

export default function Profile() {
    const { user, refreshUser } = useAuth();
    const { isPremium, plan, planExpiresAt, loading: planLoading } = useCashzPlan();
    const { showError, showSuccess } = useToast();

    const [name, setName] = useState(user?.displayName || '');
    const [saving, setSaving] = useState(false);

    const nameChanged = name.trim() !== '' && name !== (user?.displayName || '');

    async function handleSave() {
        if (!auth.currentUser || !nameChanged) return;
        setSaving(true);
        try {
            await updateProfile(auth.currentUser, { displayName: name.trim() });
            await refreshUser();
            await upsertUserProfile(auth.currentUser);
            showSuccess('Perfil atualizado.');
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            showError('Não foi possível atualizar o perfil. Tente novamente.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meu perfil</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border border-border bg-muted overflow-hidden shrink-0">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Foto vem da sua conta Google — pra trocar, atualize por lá.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input value={user?.email || ''} disabled />
                        <p className="text-xs text-muted-foreground">Gerenciado pela sua conta Google, não editável aqui.</p>
                    </div>

                    <Button onClick={handleSave} disabled={!nameChanged || saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar alterações
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Plano</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {planLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isPremium ? (
                        <div className="flex items-center gap-2">
                            <Badge>{PLAN_LABEL[plan || ''] || 'Premium'}</Badge>
                            {planExpiresAt && (
                                <span className="text-xs text-muted-foreground">
                                    válido até {new Date(planExpiresAt).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Badge variant="outline">Free</Badge>
                            <p className="text-sm text-muted-foreground">
                                Criar viagem e usar o assistente de IA exigem um plano ativo no CashZ.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open('https://cashz.vercel.app', '_blank', 'noopener,noreferrer')}
                            >
                                Assinar no CashZ
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
