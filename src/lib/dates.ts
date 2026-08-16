// src/lib/dates.ts
// Datas de viagem são strings 'yyyy-MM-dd' sem timezone. new Date(str) as
// interpreta como UTC meia-noite, o que no fuso do Brasil (UTC-3) exibe o
// dia anterior. Formata a partir da string, sem passar por Date/timezone.
export function formatDateBR(dateStr: string | undefined): string {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}
