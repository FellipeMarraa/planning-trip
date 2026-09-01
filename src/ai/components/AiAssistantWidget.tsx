import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCashzPlan } from '@/hooks/useCashzPlan';
import { useAIChat } from '../hooks/useAIChat';
import { SuggestedItineraryCard } from './SuggestedItineraryCard';
import { Loader2, Plane, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AiAssistantWidget() {
    const { tripId } = useParams<{ tripId?: string }>();
    const { isPremium } = useCashzPlan();
    const [open, setOpen] = useState(false);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [input, setInput] = useState('');
    const { messages, send, sending } = useAIChat(tripId);

    function handleOpen() {
        if (isPremium) {
            setOpen(true);
        } else {
            setUpgradeOpen(true);
        }
    }

    async function handleSend() {
        const message = input.trim();
        if (!message || sending) return;
        setInput('');
        await send(message);
    }

    return (
        <>
            <Button
                onClick={handleOpen}
                size="icon"
                className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
                aria-label="Assistente de viagem"
            >
                <Plane className="h-6 w-6 -rotate-45" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg w-[95vw] flex flex-col max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Assistente de viagem</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-3 py-2">
                        {messages.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Pergunte sobre clima, mala, melhores datas, ou peça pra montar um roteiro.
                            </p>
                        )}
                        {messages.map((m) => (
                            <div key={m.id} className={cn("space-y-2", m.role === 'user' ? 'text-right' : 'text-left')}>
                                <div className={cn(
                                    "inline-block rounded-2xl px-4 py-2 text-sm max-w-[85%] whitespace-pre-wrap text-left",
                                    m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                )}>
                                    {m.content}
                                </div>
                                {m.role === 'assistant' && tripId && m.suggestedActivities && m.suggestedActivities.length > 0 && (
                                    <SuggestedItineraryCard tripId={tripId} activities={m.suggestedActivities} />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-end gap-2 border-t border-border pt-3">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ex: quais os melhores dias pra visitar Lisboa?"
                            className="min-h-11 max-h-32 resize-none"
                        />
                        <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon" className="shrink-0">
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Plano CashZ necessário</AlertDialogTitle>
                        <AlertDialogDescription>
                            O assistente de viagem exige um plano ativo no CashZ.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => window.open('https://cashz.vercel.app', '_blank', 'noopener,noreferrer')}>
                        Assinar no CashZ
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
