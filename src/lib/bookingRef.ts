// src/lib/bookingRef.ts

// Limite de tamanho do campo livre (código de confirmação ou link). Mesmo
// valor usado no maxLength dos inputs.
export const BOOKING_REF_MAX_LENGTH = 300;

export type ParsedBookingRef =
    | { kind: 'url'; href: string; label: string }
    | { kind: 'text'; label: string };

// "Código ou link da reserva" é texto livre digitado pelo usuário. Só vira link
// clicável se for http(s) de verdade — nunca `javascript:`, `data:` etc. —
// porque o valor é renderizado num <a href>. Qualquer outra coisa (código de
// confirmação, URL sem protocolo) fica como texto puro.
export function parseBookingRef(raw: string | undefined | null): ParsedBookingRef | null {
    const value = (raw ?? '').trim();
    if (!value) return null;

    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
                return { kind: 'url', href: url.href, label: url.hostname.replace(/^www\./, '') };
            }
        } catch {
            // URL malformada: cai pra texto
        }
    }

    return { kind: 'text', label: value };
}

// Normaliza o que vem do formulário: vazio vira null (= "sem referência").
export function normalizeBookingRef(raw: string | undefined | null): string | null {
    const value = (raw ?? '').trim().slice(0, BOOKING_REF_MAX_LENGTH);
    return value || null;
}
