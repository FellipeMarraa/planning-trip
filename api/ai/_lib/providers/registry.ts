import type { AIProviderMessage, AIProviderResult } from "./types.js";
import { groqProvider } from "./groq.js";
import { ProviderNotConfiguredError } from "./types.js";

// Só Groq por decisão do usuário — sem fallback pra outro provider. Se um
// segundo provider entrar no futuro, reintroduzir a lógica de fallback aqui
// (era generateWithFallback antes de simplificar).
export async function generateReply(messages: AIProviderMessage[]): Promise<AIProviderResult> {
    if (!groqProvider.configured) throw new ProviderNotConfiguredError("groq");
    return groqProvider.generate(messages);
}
