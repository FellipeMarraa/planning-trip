import { createContext, useContext, useState, type ReactNode } from 'react';

interface AiAssistantContextType {
    activeThreadId: string | null;
    setActiveThreadId: (id: string | null) => void;
}

const AiAssistantContext = createContext<AiAssistantContextType | undefined>(undefined);

export function useAiAssistant(): AiAssistantContextType {
    const context = useContext(AiAssistantContext);
    if (!context) throw new Error('useAiAssistant deve ser usado dentro de um AiAssistantProvider');
    return context;
}

// Thread ativa compartilhada entre a lista de conversas e o painel de chat.
export function AiAssistantProvider({ children }: { children: ReactNode }) {
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

    return (
        <AiAssistantContext.Provider value={{ activeThreadId, setActiveThreadId }}>
            {children}
        </AiAssistantContext.Provider>
    );
}
