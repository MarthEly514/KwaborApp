import type { Locale } from '@/types';

const tag = (l: Locale) => (l === 'fr' ? 'fr-FR' : 'en-GB');

export const fmtDate = (iso: string, l: Locale) =>
    new Date(iso).toLocaleString(tag(l), { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export const fmtDay = (iso: string, l: Locale) =>
    new Date(iso).toLocaleDateString(tag(l), { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtTime = (iso: string, l: Locale) =>
    new Date(iso).toLocaleTimeString(tag(l), { hour: '2-digit', minute: '2-digit' });

export const fmtXof = (n: number, l: Locale, free: string) => (n ? `${n.toLocaleString(tag(l))} FCFA` : free);

export const pad = (n: number | null | undefined) => String(n ?? 0).padStart(3, '0');

/** "D-12" / "5 h" / '' once started. */
export const countdown = (iso: string, unitHours: string) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (!(ms > 0)) return '';
    const days = Math.floor(ms / 86_400_000);
    return days > 0 ? `J-${days}` : `${Math.ceil(ms / 3_600_000)} ${unitHours}`;
};
