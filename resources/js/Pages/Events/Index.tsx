import EventTile from '@/Components/EventTile';
import { Empty, Icon, LinkBtn, Reveal } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { EventCard } from '@/types';
import { Head } from '@inertiajs/react';

export default function Index({ events }: { events: EventCard[] }) {
    const { t } = useT();
    return (
        <AuthenticatedLayout>
            <Head title={t('nav.events')} />
            <Reveal>
                <div data-reveal className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="font-display text-4xl font-extrabold">{t('nav.events')}</h1>
                    <LinkBtn href={route('events.create')}><Icon n="add" />{t('events.new')}</LinkBtn>
                </div>
                {events.length === 0 ? (
                    <div data-reveal className="mt-8">
                        <Empty icon="celebration" title={t('events.empty')} hint={t('events.empty_hint')}>
                            <LinkBtn href={route('events.create')}><Icon n="add" />{t('events.new')}</LinkBtn>
                        </Empty>
                    </div>
                ) : (
                    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                        {events.map((e) => <li data-reveal key={e.id}><EventTile e={e} /></li>)}
                    </ul>
                )}
            </Reveal>
        </AuthenticatedLayout>
    );
}
