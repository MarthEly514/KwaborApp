import { Btn, Card, Icon } from '@/Components/ui';
import { fmtXof } from '@/lib/format';
import { useT } from '@/lib/i18n';
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, router } from '@inertiajs/react';

/** Stand-in for the real provider's hosted page. Exists only while PAYMENT_DRIVER=fake. */
export default function Fake({ order }: { order: { ref: string; method: string; amount_xof: number } }) {
    const { t, locale } = useT();
    const go = (result: 'success' | 'failure') => router.post(route('pay.fake.result', order.ref), { result });
    return (
        <PublicLayout>
            <Head title={t('pay.fake_title')} />
            <Card className="space-y-4 text-center">
                <p className="rounded-xl bg-sun/50 p-2 text-sm font-bold">{t('pay.fake_banner')}</p>
                <Icon n={order.method === 'card' ? 'credit_card' : 'smartphone'} className="text-6xl" />
                <p className="font-display text-4xl font-extrabold">{fmtXof(order.amount_xof, locale, '')}</p>
                <div className="grid gap-2">
                    <Btn onClick={() => go('success')}><Icon n="check" />{t('pay.fake_ok')}</Btn>
                    <Btn variant="ghost" onClick={() => go('failure')}><Icon n="close" />{t('pay.fake_ko')}</Btn>
                </div>
            </Card>
        </PublicLayout>
    );
}
