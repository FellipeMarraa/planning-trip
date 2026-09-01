import type { AIProvider, AIProviderMessage, AIProviderResult } from "./types.js";
import { ProviderNotConfiguredError } from "./types.js";

const MODEL = "llama-3.1-8b-instant";

export const groqProvider: AIProvider = {
    name: "groq",
    configured: Boolean(process.env.GROQ_API_KEY),

    async generate(messages: AIProviderMessage[]): Promise<AIProviderResult> {
        if (!process.env.GROQ_API_KEY) throw new ProviderNotConfiguredError("groq");

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages.map((m) => ({ role: m.role, content: m.content })),
            }),
        });

        if (!res.ok) {
            throw new Error(`Groq respondeu ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();

        return {
            text: data.choices?.[0]?.message?.content ?? '',
            promptTokens: data.usage?.prompt_tokens ?? 0,
            completionTokens: data.usage?.completion_tokens ?? 0,
            model: MODEL,
        };
    },
};
