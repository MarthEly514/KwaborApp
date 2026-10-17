import { Icon, Reveal } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Index() {
    const { t } = useT();
    const user = usePage().props.auth.user;
    const items = [
        ['person', 'account.profile', 'account.profile_hint', route('profile.edit')],
        ['workspace_premium', 'account.plans', 'account.plans_hint', route('account.plans')],
        ['payments', 'account.payouts', 'account.payouts_hint', route('account.payouts')],
    ] as const;
    return (
        <AuthenticatedLayout>
            <Head title={t('nav.account')} />
            <Reveal className="mx-auto max-w-xl space-y-4">
                <h1 data-reveal className="font-display text-4xl font-extrabold">{t('nav.account')}</h1>
                <p data-reveal className="text-ink/70">{user.name} · {user.email}</p>
                {items.map(([icon, title, hint, href]) => (
                    <Link data-reveal key={title} href={href} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-lg">
                        <Icon n={icon} className="text-3xl text-brand-dark" />
                        <span className="flex-1"><b className="block">{t(title)}</b><span className="text-sm text-ink/70">{t(hint)}</span></span>
                        <Icon n="chevron_right" />
                    </Link>
                ))}
            </Reveal>
        </AuthenticatedLayout>
    );
}
