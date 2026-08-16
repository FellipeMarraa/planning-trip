// src/lib/inAppBrowser.ts
// Navegadores embutidos (WhatsApp, Instagram, Facebook, TikTok, Line...) bloqueiam
// o login do Google (erro "disallowed_useragent") independente de popup ou redirect.
// A única saída é abrir o link no navegador padrão do celular.
const IN_APP_BROWSER_PATTERNS = [
    /FBAN|FBAV|FB_IAB/i,      // Facebook / Messenger
    /Instagram/i,
    /WhatsApp/i,
    /Line\//i,
    /MicroMessenger/i,        // WeChat
    /TikTok|musical_ly/i,
    /Twitter/i,
    /Snapchat/i,
];

export function isInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua));
}
