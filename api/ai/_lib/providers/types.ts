export interface AIProviderMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIProviderResult {
    text: string;
    promptTokens: number;
    completionTokens: number;
    model: string;
    // Nº de chamadas de ferramenta embutida (ex.: busca na web do Groq
    // Compound) — cobradas à parte do token, precisa entrar no cálculo de
    // custo (ver api/ai/_lib/usage.ts). 0/undefined pra provider sem isso.
    toolCalls?: number;
}

export interface AIProvider {
    readonly name: string;
    readonly configured: boolean;
    generate(messages: AIProviderMessage[]): Promise<AIProviderResult>;
}

export class ProviderNotConfiguredError extends Error {
    constructor(providerName: string) {
        super(`Provider "${providerName}" não está configurado (chave de API ausente).`);
    }
}
