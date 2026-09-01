import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCashzPlan } from '@/hooks/useCashzPlan';
import { AiAssistantProvider, useAiAssistant } from '../contexts/AiAssistantContext';
import { useAIChat } from '../hooks/useAIChat';
import { useAIThreads } from '../hooks/useAIThreads';
import { SuggestedItineraryCard } from './SuggestedItineraryCard';
import { SuggestedTripCard } from './SuggestedTripCard';
import { ChatMarkdown } from './ChatMarkdown';
import { ChevronLeft, Loader2, MessageSquarePlus, Plane, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
    'Quais os melhores dias pra visitar esse destino?',
    'Como costuma ser o clima na época da viagem?',
    'O que levar na mala?',
    'Monta um roteiro de 3 dias',
];

function ThreadList({ onSelectThread }: { onSelectThread: () => void }) {
    const { threads, isLoading, archiveThread } = useAIThreads();
    const { activeThreadId, setActiveThreadId } = useAiAssistant();

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-border">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => { setActiveThreadId(null); onSelectThread(); }}
                >
                    <MessageSquarePlus className="h-4 w-4" /> Nova conversa
                </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {isLoading && (
                    <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                )}
                {!isLoading && threads.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6 px-2">Nenhuma conversa ainda. Pergunte algo pro assistente.</p>
                )}
                {threads.map((thread) => (
                    <button
                        key={thread.id}
                        onClick={() => { setActiveThreadId(thread.id); onSelectThread(); }}
                        className={cn(
                            "w-full text-left rounded-xl px-3 py-2 text-xs transition-colors group relative",
                            activeThreadId === thread.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                    >
                        <p className="font-medium truncate pr-5">{thread.title}</p>
                        {thread.lastMessagePreview && (
                            <p className="text-[10px] text-muted-foreground truncate">{thread.lastMessagePreview}</p>
                        )}
                        <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); archiveThread(thread.id); }}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function ChatPanel({ tripId }: { tripId?: string }) {
    const { activeThreadId, setActiveThreadId } = useAiAssistant();
    const { messages, send, sending } = useAIChat(activeThreadId, setActiveThreadId, tripId);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function handleSend(text?: string) {
        const content = (text ?? input).trim();
        if (!content || sending) return;
        setInput('');
        await send(content);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-6">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Plane className="h-6 w-6 text-primary -rotate-45" />
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[240px]">
                            Pergunte sobre clima, mala, melhores datas, ou peça pra montar um roteiro.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleSend(s)}
                                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m) => (
                    <div key={m.id} className={cn("space-y-2", m.role === 'user' ? 'text-right' : 'text-left')}>
                        <div className={cn(
                            "inline-block rounded-2xl px-4 py-2 max-w-[90%] text-left",
                            m.role === 'user' ? "bg-primary text-primary-foreground text-sm whitespace-pre-wrap" : "bg-muted text-foreground"
                        )}>
                            {m.role === 'assistant' ? <ChatMarkdown content={m.content} /> : m.content}
                        </div>
                        {m.role === 'assistant' && tripId && m.suggestedActivities && m.suggestedActivities.length > 0 && (
                            <SuggestedItineraryCard tripId={tripId} activities={m.suggestedActivities} />
                        )}
                        {m.role === 'assistant' && m.suggestedTrip && (
                            <SuggestedTripCard trip={m.suggestedTrip} />
                        )}
                    </div>
                ))}

                {sending && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl px-4 py-2.5">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <div className="flex items-end gap-2 border-t border-border p-3">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Pergunte algo sobre a viagem..."
                    className="min-h-11 max-h-32 resize-none"
                />
                <Button onClick={() => handleSend()} disabled={sending || !input.trim()} size="icon" className="shrink-0">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}

type WidgetView = 'list' | 'chat';

function WidgetHeader({ onBack, onClose }: { onBack?: () => void; onClose: () => void }) {
    return (
        <div className="flex items-center gap-2 border-b border-border px-3 py-3 shrink-0">
            {onBack && (
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 shrink-0" onClick={onBack}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <Plane className="h-4 w-4 text-primary -rotate-45 shrink-0" />
                <p className="font-semibold text-sm truncate">Assistente de viagem</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

// Painel fixo próprio (não Dialog do shadcn) — mesma navegação em pilha do
// widget de IA do CashZ (lista de conversas → chat), pra virar tela cheia no
// mobile sem brigar com posicionamento de Popover/Dialog.
function WidgetPanel({ tripId, onClose }: { tripId?: string; onClose: () => void }) {
    const [view, setView] = useState<WidgetView>('list');
    const { activeThreadId } = useAiAssistant();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className={cn(
            "fixed z-50 flex flex-col bg-background border border-border shadow-2xl overflow-hidden",
            "inset-0",
            "sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl"
        )}>
            {view === 'list' ? (
                <>
                    <WidgetHeader onClose={onClose} />
                    <div className="flex-1 min-h-0">
                        <ThreadList onSelectThread={() => setView('chat')} />
                    </div>
                </>
            ) : (
                <>
                    <WidgetHeader onBack={() => setView('list')} onClose={onClose} />
                    <div className="flex-1 min-h-0">
                        {/* key força reset de estado (mensagens) ao trocar de
                            conversa, em vez de limpar via effect. */}
                        <ChatPanel key={activeThreadId ?? 'new'} tripId={tripId} />
                    </div>
                </>
            )}
        </div>
    );
}

export function AiAssistantWidget() {
    const { tripId } = useParams<{ tripId?: string }>();
    const { isPremium } = useCashzPlan();
    const [open, setOpen] = useState(false);
    const [upgradeOpen, setUpgradeOpen] = useState(false);

    function handleOpen() {
        if (isPremium) {
            setOpen(true);
        } else {
            setUpgradeOpen(true);
        }
    }

    return (
        <AiAssistantProvider>
            {!open && (
                <Button
                    onClick={handleOpen}
                    size="icon"
                    className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
                    aria-label="Assistente de viagem"
                >
                    <Plane className="h-6 w-6 -rotate-45" />
                </Button>
            )}

            {open && <WidgetPanel tripId={tripId} onClose={() => setOpen(false)} />}

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
        </AiAssistantProvider>
    );
}
