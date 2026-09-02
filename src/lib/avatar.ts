// src/lib/avatar.ts
// Gera avatar de iniciais localmente (SVG inline, sem rede) — antes usava
// ui-avatars.com (serviço externo), que falhava/demorava de vez em quando
// (ícone de perfil do header às vezes não carregava). Zero dependência de
// rede: decodifica instantâneo, nunca falha.
const AVATAR_COLORS = ['#F87171', '#FB923C', '#FBBF24', '#A3E635', '#34D399', '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6'];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateAvatarDataUri(name: string | null | undefined): string {
    const displayName = name?.trim() || 'Usuário';
    const initials = getInitials(displayName);
    const color = AVATAR_COLORS[hashString(displayName) % AVATAR_COLORS.length];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">`
        + `<rect width="128" height="128" fill="${color}" rx="64"/>`
        + `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" font-size="52" fill="#fff" font-weight="600">${initials}</text>`
        + `</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
