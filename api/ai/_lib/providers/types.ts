export interface AIProviderMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIProviderResult {
    text: string;
    promptTokens: number;
    completionTokens: number;
    model: string;
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
