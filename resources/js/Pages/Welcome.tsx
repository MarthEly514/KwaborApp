import { Icon, LangSwitch, LinkBtn, Logo, Reveal } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';

const FEATURES = [
    ['link', 'landing.f1'],
    ['badge', 'landing.f2'],
    ['notifications_active', 'landing.f3'],
    ['qr_code_2', 'landing.f4'],
    ['redeem', 'landing.f5'],
    ['photo_library', 'landing.f6'],
] as const;

export default function Welcome({ auth }: PageProps) {
    const { t } = useT();
    return (
        <>
            <Head title={t('landing.head')} />
            <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
                <Logo />
                <div className="flex items-center gap-2">
                    <LangSwitch />
                    {auth.user ? (
                        <LinkBtn href={route('dashboard')}>{t('nav.dashboard')}</LinkBtn>
                    ) : (
                        <LinkBtn href={route('login')} variant="ghost">{t('auth.login')}</LinkBtn>
                    )}
                </div>
            </header>
            <Reveal className="mx-auto max-w-5xl px-4 pb-16">
                <section className="py-12 text-center sm:py-20">
                    <h1 data-reveal className="font-display text-5xl font-extrabold leading-[1.05] sm:text-7xl">
                        {t('landing.title_a')} <span className="text-brand-dark">{t('landing.title_b')}</span>,<br />{t('landing.title_c')}
                    </h1>
                    <p data-reveal className="mx-auto mt-5 max-w-xl text-lg text-ink/80">{t('landing.subtitle')}</p>
                    <div data-reveal className="mt-8 flex flex-wrap justify-center gap-3">
                        <LinkBtn href={auth.user ? route('events.create') : route('register')}><Icon n="add_circle" />{t('landing.cta')}</LinkBtn>
                        {!auth.user && <LinkBtn href={route('login')} variant="ghost">{t('auth.login')}</LinkBtn>}
                    </div>
                </section>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('landing.features')}>
                    {FEATURES.map(([icon, key]) => (
                        <div data-reveal key={key} className="rounded-3xl bg-cream/60 p-6">
                            <Icon n={icon} className="text-3xl text-brand-dark" />
                            <h3 className="mt-2 font-display text-xl font-bold">{t(`${key}.title`)}</h3>
                            <p className="mt-1 text-ink/80">{t(`${key}.text`)}</p>
                        </div>
                    ))}
                </section>
            </Reveal>
        </>
    );
}
