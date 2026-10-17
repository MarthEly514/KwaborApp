import { Btn, Card, CopyButton, Empty, H2, Icon, Pill, Reveal, inputCls } from '@/Components/ui';
import { fmtTime, pad } from '@/lib/format';
import { useT } from '@/lib/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePoll, useForm } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEventHandler, useState } from 'react';

interface Props {
    event: { id: number; title: string; status: string };
    counts: { arrived: number; expected: number };
    attendees: { id: number; name: string; number: number; companions: number; table: string | null; scanned_at: string | null }[];
    links: { id: number; label: string; url: string; last_used_at: string | null }[];
    canEdit: boolean;
}

export default function Checkin({ event, counts, attendees, links, canEdit }: Props) {
    const { t, locale } = useT();
    const [q, setQ] = useState('');
    const form = useForm({ label: '' });
    usePoll(5000, { only: ['counts', 'attendees', 'links'] }); // live door count without a websocket

    const shown = attendees.filter((a) => `${a.name} ${a.number}`.toLowerCase().includes(q.trim().toLowerCase()));
    const pct = counts.expected ? (counts.arrived / counts.expected) * 100 : 0;

    const create: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('scanner-links.store', event.id), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('checkin.title')} />
            <Reveal className="space-y-6">
                <Link data-reveal href={route('events.show', event.id)} className="inline-flex min-h-11 items-center gap-1 font-bold text-brand-dark"><Icon n="arrow_back" />{event.title}</Link>
                <h1 data-reveal className="font-display text-4xl font-extrabold">{t('checkin.title')}</h1>

                <Card className="space-y-3">
                    <p data-reveal className="font-display text-5xl font-extrabold">
                        {counts.arrived} <span className="text-2xl text-ink/60">{t('checkin.of', { n: counts.expected })}</span>
                    </p>
                    <div className="h-3 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={counts.expected} aria-valuenow={counts.arrived}>
                        <div className="h-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-sm text-ink/70">{t('checkin.hint')}</p>
                </Card>

                <Card className="space-y-4">
                    <div>
                        <H2><Icon n="badge" /> {t('door.title')}</H2>
                        <p className="text-sm text-ink/70">{t('door.hint')}</p>
                    </div>
                    {event.status !== 'published' && <p className="rounded-2xl bg-sun/40 p-3 text-sm font-bold">{t('door.not_live')}</p>}
                    {canEdit && (
                        <form onSubmit={create} className="flex flex-wrap gap-2">
                            <input required maxLength={60} className={`${inputCls} min-w-40 flex-1`} aria-label={t('door.label')} placeholder={t('door.label_ph')} value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} />
                            <Btn type="submit" disabled={form.processing}><Icon n="add_link" />{t('door.create')}</Btn>
                        </form>
                    )}
                    {links.length === 0 ? (
                        <p className="text-ink/70">{t('door.none')}</p>
                    ) : (
                        <ul className="divide-y divide-ink/10">
                            {links.map((l) => (
                                <li key={l.id} className="space-y-2 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-bold">{l.label} <span className="font-normal text-ink/60">· {l.last_used_at ? t('door.last_used', { time: fmtTime(l.last_used_at, locale) }) : t('door.never_used')}</span></span>
                                        <span className="flex gap-2">
                                            <CopyButton text={l.url} className="min-h-10" label={t('common.copy_link')} />
                                            {canEdit && (
                                                <Btn variant="danger" className="min-h-10" onClick={() => confirm(t('door.revoke_confirm', { label: l.label })) && router.delete(route('scanner-links.destroy', [event.id, l.id]), { preserveScroll: true })}>
                                                    <Icon n="link_off" />{t('door.revoke')}
                                                </Btn>
                                            )}
                                        </span>
                                    </div>
                                    <details>
                                        <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-brand-dark">{t('door.show_qr')}</summary>
                                        <div className="inline-block rounded-2xl border-4 border-ink bg-white p-3"><QRCodeSVG value={l.url} size={160} /></div>
                                    </details>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="space-y-3">
                    <H2>{t('checkin.list')}</H2>
                    <input className={inputCls} aria-label={t('common.search')} placeholder={t('checkin.search')} value={q} onChange={(e) => setQ(e.target.value)} />
                    {attendees.length === 0 ? (
                        <Empty icon="how_to_reg" title={t('checkin.none')} />
                    ) : (
                        <ul className="space-y-2">
                            {shown.map((a) => (
                                <li key={a.id} className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3 ${a.scanned_at ? 'border-green-700 bg-green-50' : 'border-ink/15 bg-white'}`}>
                                    <span>
                                        <b className="text-lg">{a.name || t('common.guest')}</b>
                                        <span className="block text-sm text-ink/70">
                                            #{pad(a.number)}{a.companions ? ` · +${a.companions}` : ''}{a.table ? ` · ${t('guest.table')} ${a.table}` : ''}
                                            {a.scanned_at && <> · <Pill tone="ok"><Icon n="login" />{fmtTime(a.scanned_at, locale)}</Pill></>}
                                        </span>
                                    </span>
                                    {canEdit && (
                                        <Btn variant={a.scanned_at ? 'ghost' : 'primary'} className="min-h-10 shrink-0"
                                            onClick={() => router.post(route('rsvps.toggle-scan', [event.id, a.id]), {}, { preserveScroll: true })}>
                                            <Icon n={a.scanned_at ? 'undo' : 'login'} />{a.scanned_at ? t('checkin.undo') : t('checkin.admit')}
                                        </Btn>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </Reveal>
        </AuthenticatedLayout>
    );
}
