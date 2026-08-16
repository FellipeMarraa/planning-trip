// src/lib/postLoginRedirect.ts
// signInWithRedirect recarrega a página inteira (sai pro Google e volta), então
// o destino pretendido não pode viver só em memória/location.state — precisa
// sobreviver ao reload. sessionStorage persiste durante a ida-e-volta na mesma aba.
const KEY = 'postLoginRedirect';

export function savePostLoginRedirect(path: string) {
    try {
        sessionStorage.setItem(KEY, path);
    } catch {
        // sessionStorage indisponível (ex: modo privado restrito) — sem problema, só perde o redirect
    }
}

export function consumePostLoginRedirect(): string | null {
    try {
        const value = sessionStorage.getItem(KEY);
        if (value) sessionStorage.removeItem(KEY);
        return value;
    } catch {
        return null;
    }
}
