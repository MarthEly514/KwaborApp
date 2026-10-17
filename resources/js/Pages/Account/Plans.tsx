import { Card, Empty, LinkBtn, Reveal } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

// Placeholder: pricing and the money flow are not decided yet (see docs/ARCHITECTURE.md, decisions 1 and 2).
export default function Plans() {
    const { t } = useT();
    return (
        <AuthenticatedLayout>
            <Head title={t('account.plans')} />
            <Reveal className="mx-auto max-w-xl space-y-4">
                <h1 data-reveal className="font-display text-4xl font-extrabold">{t('account.plans')}</h1>
                <Card><div data-reveal><Empty icon="hourglass_top" title={t('account.soon')} hint={t('account.plans_soon')}>
                    <LinkBtn href={route('account.index')} variant="ghost">{t('common.back')}</LinkBtn>
                </Empty></div></Card>
            </Reveal>
        </AuthenticatedLayout>
    );
}
