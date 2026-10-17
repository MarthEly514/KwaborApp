import EventTile from '@/Components/EventTile';
import { Empty, H2, Icon, LinkBtn, Reveal, Stat } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { EventCard, PageProps } from '@/types';
import { Head } from '@inertiajs/react';

export default function Dashboard({ auth, totals, upcoming }: PageProps<{ totals: { events: number; published: number; people: number }; upcoming: EventCard[] }>) {
    const { t } = useT();
    return (
        <AuthenticatedLayout>
            <Head title={t('nav.dashboard')} />
            <Reveal className="space-y-8">
                <div data-reveal className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="font-display text-4xl font-extrabold">{t('dash.hello', { name: auth.user.name.split(' ')[0] })}</h1>
                    <LinkBtn href={route('events.create')}><Icon n="add" />{t('events.new')}</LinkBtn>
                </div>
                <div data-reveal className="grid grid-cols-3 gap-3">
                    <Stat label={t('dash.events')} value={totals.events} />
                    <Stat label={t('dash.published')} value={totals.published} tone="text-green-800" />
                    <Stat label={t('dash.people')} value={totals.people} tone="text-brand-dark" />
                </div>
                <section data-reveal>
                    <div className="mb-3 flex items-center justify-between">
                        <H2>{t('dash.upcoming')}</H2>
                        <LinkBtn href={route('events.index')} variant="ghost" className="min-h-10">{t('dash.all')}</LinkBtn>
                    </div>
                    {upcoming.length === 0 ? (
                        <Empty icon="celebration" title={t('events.empty')} hint={t('events.empty_hint')}>
                            <LinkBtn href={route('events.create')}><Icon n="add" />{t('events.new')}</LinkBtn>
                        </Empty>
                    ) : (
                        <ul className="grid gap-4 sm:grid-cols-2">
                            {upcoming.map((e) => <li key={e.id}><EventTile e={e} /></li>)}
                        </ul>
                    )}
                </section>
            </Reveal>
        </AuthenticatedLayout>
    );
}
