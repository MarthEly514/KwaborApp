import { countdown, fmtDate, fmtXof } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { themeOf } from '@/lib/themes';
import { ReactNode } from 'react';
import { Icon } from './ui';

interface Props {
    title: string;
    host: string;
    startsAt: string;
    location: string;
    description?: string | null;
    theme: string;
    price: number;
    guest?: string | null;
    children?: ReactNode;
}

export default function InvitationCard(p: Props) {
    const { t, locale } = useT();
    const th = themeOf(p.theme);
    const left = p.startsAt ? countdown(p.startsAt, t('card.hours')) : '';
    return (
        <div className="relative overflow-hidden rounded-3xl p-7 shadow-xl sm:p-10" style={{ background: th.bg, color: th.fg }}>
            <div className="absolute -right-16 -top-16 size-52 rounded-full opacity-40" style={{ background: th.accent }} />
            <div className="absolute -bottom-20 -left-10 size-56 rounded-full opacity-30" style={{ background: th.soft }} />
            <div className="relative">
                <p className="text-sm font-bold uppercase tracking-widest opacity-90">
                    {p.guest ? t('card.dear', { name: p.guest }) : t('card.invited')}
                </p>
                {left && (
                    <span className="mt-3 inline-block rounded-full px-3 py-1 text-sm font-extrabold" style={{ background: th.accent, color: '#2B1708' }}>
                        {left}
                    </span>
                )}
                <h2 className="mt-3 break-words font-display text-4xl font-extrabold leading-tight sm:text-5xl">{p.title || t('card.title_placeholder')}</h2>
                <p className="mt-2 opacity-90">{t('card.by', { host: p.host || '…' })}</p>
                <ul className="mt-6 space-y-2 font-medium">
                    <li className="flex gap-2"><Icon n="event" />{p.startsAt ? fmtDate(p.startsAt, locale) : t('card.date_tbd')}</li>
                    <li className="flex gap-2"><Icon n="location_on" />{p.location || t('card.place_tbd')}</li>
                    <li className="flex gap-2"><Icon n="confirmation_number" />{fmtXof(p.price, locale, t('common.free'))}</li>
                </ul>
                {p.description && (
                    <p className="mt-6 rounded-2xl p-4 text-sm leading-relaxed" style={{ background: th.soft + '66' }}>{p.description}</p>
                )}
                {p.children}
            </div>
        </div>
    );
}
