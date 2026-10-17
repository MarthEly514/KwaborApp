import { Btn, Card, H2, Icon, LinkBtn } from '@/Components/ui';
import { fmtXof } from '@/lib/format';
import { useT } from '@/lib/i18n';
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    order: { ref: string; method: 'momo' | 'card'; amount_xof: number };
    event: { title: string; theme: string };
    name: string;
    people: number;
    unit: number;
    holdMinutes: number;
    back: string;
}

/** Payment wall. The provider (not this page) decides whether the payment succeeded. */
export default function Checkout({ order, event, name, people, unit, holdMinutes, back }: Props) {
    const { t, locale } = useT();
    const [method, setMethod] = useState(order.method);
    const [busy, setBusy] = useState(false);
    const options = [
        ['momo', 'smartphone', 'pay.momo', 'pay.momo_hint'],
        ['card', 'credit_card', 'pay.card', 'pay.card_hint'],
    ] as const;

    return (
        <PublicLayout>
            <Head title={t('pay.title')} />
            <div className="space-y-5">
                <h1 className="font-display text-4xl font-extrabold">{t('pay.title')}</h1>
                <Card>
                    <p className="font-bold">{event.title}</p>
                    <p className="text-sm text-ink/70">{name} · {t('pay.people', { n: people })} × {fmtXof(unit, locale, '')}</p>
                    <p className="mt-3 font-display text-4xl font-extrabold">{fmtXof(order.amount_xof, locale, '')}</p>
                </Card>
                <Card className="space-y-3">
                    <H2>{t('pay.method')}</H2>
                    <div role="radiogroup" className="grid gap-2">
                        {options.map(([v, icon, label, hint]) => (
                            <button key={v} type="button" role="radio" aria-checked={method === v} onClick={() => setMethod(v)}
                                className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-3 text-left cursor-pointer ${method === v ? 'border-brand bg-cream/60' : 'border-ink/15'}`}>
                                <Icon n={icon} className="text-3xl" />
                                <span><b className="block">{t(label)}</b><span className="text-sm text-ink/70">{t(hint)}</span></span>
                                {method === v && <Icon n="check_circle" className="ms-auto text-2xl text-brand-dark" />}
                            </button>
                        ))}
                    </div>
                </Card>
                <p className="text-sm text-ink/70"><Icon n="timer" /> {t('pay.hold', { n: holdMinutes })}</p>
                <Btn className="w-full" disabled={busy} onClick={() => { setBusy(true); router.post(route('pay.start', order.ref), { method }, { onFinish: () => setBusy(false) }); }}>
                    <Icon n="lock" />{t('pay.pay', { amount: fmtXof(order.amount_xof, locale, '') })}
                </Btn>
                <LinkBtn href={back} variant="ghost" className="w-full">{t('common.back')}</LinkBtn>
            </div>
        </PublicLayout>
    );
}
