// src/components/trip/CurrencyLotForm.tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { createCurrencyLot } from '@/services/currencyLots';
import { useToast } from '@/context/ToastContext';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/common/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet } from "lucide-react";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";

interface CurrencyLotFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tripId: string;
    ownerUid: string;
    ownerLabel: string;
}

const nowDate = () => format(new Date(), 'yyyy-MM-dd');

export function CurrencyLotForm({ open, onOpenChange, tripId, ownerUid, ownerLabel }: CurrencyLotFormProps) {
    const { showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [currency, setCurrency] = useState<CurrencyCode>('EUR');
    const [amountPurchased, setAmountPurchased] = useState(0);
    const [ratePaidBRL, setRatePaidBRL] = useState(0);
    const [purchaseDate, setPurchaseDate] = useState(nowDate());

    const foreignCurrencies = CURRENCIES.filter((c) => c.code !== 'BRL');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amountPurchased <= 0 || ratePaidBRL <= 0) return;

        setLoading(true);
        try {
            await createCurrencyLot({ tripId, ownerUid, currency, amountPurchased, ratePaidBRL, purchaseDate });
            setAmountPurchased(0);
            setRatePaidBRL(0);
            setPurchaseDate(nowDate());
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao registrar compra de câmbio:', error);
            showError('Não foi possível registrar a compra.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[380px] rounded-3xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-primary" /> Registrar compra de câmbio
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <p className="text-xs text-muted-foreground">Pra {ownerLabel}. Só um registro de planejamento — não afeta a divisão de gastos da viagem.</p>

                        <div className="grid gap-2">
                            <Label>Moeda</Label>
                            <Select value={currency} onValueChange={(v: CurrencyCode) => setCurrency(v)}>
                                <SelectTrigger className="h-10 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {foreignCurrencies.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>{c.label} ({c.symbol})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Valor comprado ({currency})</Label>
                                <MoneyInput
                                    className="h-10"
                                    value={amountPurchased}
                                    onValueChange={setAmountPurchased}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Cotação paga (R$)</Label>
                                <MoneyInput
                                    className="h-10"
                                    prefix="R$"
                                    decimals={4}
                                    value={ratePaidBRL}
                                    onValueChange={setRatePaidBRL}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Data da compra</Label>
                            <Input
                                type="date"
                                className="h-10"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading || amountPurchased <= 0 || ratePaidBRL <= 0}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Registrar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
