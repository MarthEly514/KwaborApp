import { fmtDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { themeOf } from '@/lib/themes';
import { EventCard } from '@/types';
import { Link } from '@inertiajs/react';
import { Icon, Pill } from './ui';

export default function EventTile({ e }: { e: EventCard }) {
    const { t, locale } = useT();
    return (
        <Link href={route('events.show', e.id)} className="block overflow-hidden rounded-3xl bg-white shadow-sm transition hover:shadow-lg">
            <div className="h-3" style={{ background: themeOf(e.theme).bg }} />
            <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-2xl font-bold leading-tight">{e.title}</h3>
                    <Pill tone={e.status}>{t(`status.${e.status}`)}</Pill>
                </div>
                <p className="mt-1 text-ink/70">{fmtDate(e.starts_at, locale)}</p>
                <p className="flex gap-1 text-sm text-ink/70"><Icon n="location_on" />{e.location}</p>
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
                    <span className="text-green-800"><Icon n="check_circle" /> {t('events.yes_count', { n: e.stats.yes })}</span>
                    <span className="text-red-800"><Icon n="cancel" /> {t('events.no_count', { n: e.stats.no })}</span>
                    <span><Icon n="groups" /> {t('events.people_count', { n: e.stats.people })}</span>
                </p>
            </div>
        </Link>
    );
}
