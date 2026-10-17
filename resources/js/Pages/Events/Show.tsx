import { Btn, Card, CopyButton, Empty, ExtBtn, H2, Icon, LinkBtn, Pill, Reveal, Stat, btnCls, inputCls } from '@/Components/ui';
import { fmtDate, fmtDay, pad } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { downloadCsv, isPhone, mailUrl, resizeImage, smsUrl, whatsappUrl } from '@/lib/share';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { EventStats, EventStatus } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ChangeEvent, FormEventHandler, useState } from 'react';

interface Ev {
    id: number; title: string; host: string; location: string; theme: string; status: EventStatus; price_xof: number;
    capacity: number | null; starts_at: string; rsvp_deadline_at: string | null; album_expires_at: string; photo_retention_days: number;
    summary: { yes: number; no: number; pending: number; people: number } | null;
}
interface G { id: number; name: string; phone: string | null; email: string | null; table: string | null; url: string; answer: string | null; companions: number | null }
interface R { id: number; name: string; answer: string; number: number | null; companions: number; note: string | null; contact: string | null; payment_status: string; scanned_at: string | null; table: string | null }
interface Props {
    event: Ev; stats: EventStats; openUrl: string; albumUrl: string; guests: G[]; rsvps: R[];
    gifts: { id: number; label: string; url: string | null; claimed_by: string | null }[];
    photos: { id: number; src: string }[]; can: { update: boolean; delete: boolean };
}
type Tab = 'guests' | 'responses' | 'gifts' | 'photos';

export default function Show(p: Props) {
    const { t, locale } = useT();
    const { event: ev, stats, can } = p;
    const [tab, setTab] = useState<Tab>('guests');
    const live = ev.status !== 'draft';
    const msg = (name?: string) => t(name ? 'msg.invite_named' : 'msg.invite', { name: name ?? '', title: ev.title });

    const tabs: [Tab, string, string][] = [
        ['guests', 'group', t('tab.guests')],
        ['responses', 'fact_check', t('tab.responses')],
        ['gifts', 'redeem', t('tab.gifts')],
        ['photos', 'photo_library', t('tab.photos')],
    ];

    return (
        <AuthenticatedLayout>
            <Head title={ev.title} />
            <Reveal className="space-y-6">
                <div data-reveal className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-4xl font-extrabold">{ev.title}</h1>
                            <Pill tone={ev.status}>{t(`status.${ev.status}`)}</Pill>
                        </div>
                        <p className="text-ink/70">{fmtDate(ev.starts_at, locale)} · {ev.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <LinkBtn href={route('events.preview', ev.id)} variant="ghost"><Icon n="visibility" />{t('event.preview')}</LinkBtn>
                        {live && <LinkBtn href={route('events.checkin', ev.id)} variant="dark"><Icon n="qr_code_scanner" />{t('event.checkin')}</LinkBtn>}
                        {can.update && <LinkBtn href={route('events.edit', ev.id)} variant="ghost"><Icon n="edit" />{t('common.edit')}</LinkBtn>}
                        {ev.status === 'published' && (
                            <Btn variant="ghost" onClick={() => confirm(t('event.end_confirm')) && router.post(route('events.end', ev.id), {}, { preserveScroll: true })}>
                                <Icon n="event_available" />{t('event.end')}
                            </Btn>
                        )}
                        {can.delete && (
                            <Btn variant="danger" aria-label={t('common.delete')} onClick={() => confirm(t('event.delete_confirm')) && router.delete(route('events.destroy', ev.id))}>
                                <Icon n="delete" />
                            </Btn>
                        )}
                    </div>
                </div>

                {ev.status === 'draft' && (
                    <div data-reveal role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-sun/40 p-5">
                        <p className="max-w-lg font-bold"><Icon n="info" /> {t('event.draft_banner')}</p>
                        <Btn onClick={() => router.post(route('events.publish', ev.id), {}, { preserveScroll: true })}><Icon n="rocket_launch" />{t('event.publish')}</Btn>
                    </div>
                )}
                {ev.status === 'ended' && <p data-reveal className="rounded-3xl bg-ink/10 p-4 font-bold"><Icon n="lock" /> {t('event.ended_banner')}</p>}

                <Card className="space-y-4">
                    <div data-reveal className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <Stat label={t('stat.invited')} value={stats.invited} />
                        <Stat label={t('stat.yes')} value={stats.yes} tone="text-green-800" />
                        <Stat label={t('stat.no')} value={stats.no} tone="text-red-800" />
                        <Stat label={t('stat.pending')} value={stats.pending} />
                        <Stat label={t('stat.people')} value={stats.people} tone="text-brand-dark" />
                    </div>
                    {(ev.capacity || ev.rsvp_deadline_at) && (
                        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-ink/80">
                            {ev.capacity && (
                                <span><Icon n="groups" /> {t('event.seats', { n: stats.people, max: ev.capacity })}{stats.spots_left === 0 && ` · ${t('event.full')}`}</span>
                            )}
                            {ev.rsvp_deadline_at && (
                                <span><Icon n="timer" /> {t('event.deadline', { date: fmtDate(ev.rsvp_deadline_at, locale) })}{ev.summary && ` · ${t('event.closed')}`}</span>
                            )}
                        </p>
                    )}
                    {ev.summary && (
                        <div className="rounded-2xl bg-cream/60 p-4 text-sm font-bold">
                            <Icon n="summarize" /> {t('event.summary', { yes: ev.summary.yes, no: ev.summary.no, pending: ev.summary.pending, people: ev.summary.people })}
                        </div>
                    )}
                    {stats.invited > 0 && (
                        <div>
                            <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={stats.invited} aria-valuenow={stats.invited - stats.pending}>
                                <div className="h-full bg-brand" style={{ width: `${((stats.invited - stats.pending) / stats.invited) * 100}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-ink/70">{t('event.answered', { a: stats.invited - stats.pending, n: stats.invited })}</p>
                        </div>
                    )}
                </Card>

                <Card>
                    <H2>{t('share.title')}</H2>
                    <p className="text-sm text-ink/70">{t('share.hint')}</p>
                    {live ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <CopyButton variant="primary" text={p.openUrl} label={t('common.copy_link')} />
                            <ExtBtn href={whatsappUrl(`${msg()} ${p.openUrl}`)}><Icon n="send" />WhatsApp</ExtBtn>
                            <ExtBtn href={smsUrl(`${msg()} ${p.openUrl}`)} target="_self"><Icon n="sms" />SMS</ExtBtn>
                            <ExtBtn href={mailUrl(ev.title, `${msg()} ${p.openUrl}`)} target="_self"><Icon n="mail" />E-mail</ExtBtn>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm font-bold text-ink/70">{t('share.draft')}</p>
                    )}
                </Card>

                <div data-reveal role="tablist" className="flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm">
                    {tabs.map(([k, icon, label]) => (
                        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                            className={`flex min-h-11 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full px-4 font-bold cursor-pointer ${tab === k ? 'bg-ink text-cream' : 'hover:bg-cream/70'}`}>
                            <Icon n={icon} />{label}
                        </button>
                    ))}
                </div>

                {tab === 'guests' && <GuestsTab {...p} live={live} msg={msg} />}
                {tab === 'responses' && <ResponsesTab {...p} />}
                {tab === 'gifts' && <GiftsTab gifts={p.gifts} />}
                {tab === 'photos' && <PhotosTab {...p} />}
            </Reveal>
        </AuthenticatedLayout>
    );
}

function GuestsTab({ event: ev, guests, can, live, msg }: Props & { live: boolean; msg: (n?: string) => string }) {
    const { t } = useT();
    const add = useForm({ name: '', contact: '' });
    const bulk = useForm({ text: '' });
    const pending = guests.filter((g) => !g.answer && g.phone);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const c = add.data.contact.trim();
        router.post(route('guests.store', ev.id), { name: add.data.name, phone: c && !c.includes('@') ? c : null, email: c.includes('@') ? c : null },
            { preserveScroll: true, onSuccess: () => add.reset(), onError: (er) => add.setError(er as never) });
    };
    const status = (g: G) => (!g.answer ? t('guest.waiting') : g.answer === 'yes' ? t('guest.coming') + (g.companions ? ` (+${g.companions})` : '') : t('guest.declined'));
    const tone = (g: G) => (!g.answer ? 'text-ink/60' : g.answer === 'yes' ? 'text-green-800' : 'text-red-800');

    return (
        <Card className="space-y-4">
            <div>
                <H2>{t('guest.title')}</H2>
                <p className="text-sm text-ink/70">{t('guest.hint')}</p>
            </div>
            {can.update && (
                <>
                    <form onSubmit={submit} className="flex flex-wrap gap-2">
                        <input required className={`${inputCls} min-w-40 flex-1`} aria-label={t('guest.name')} placeholder={t('guest.name')} value={add.data.name} onChange={(e) => add.setData('name', e.target.value)} />
                        <input className={`${inputCls} min-w-40 flex-1`} aria-label={t('guest.contact')} placeholder={t('guest.contact')} value={add.data.contact} onChange={(e) => add.setData('contact', e.target.value)} />
                        <Btn type="submit"><Icon n="person_add" />{t('common.add')}</Btn>
                    </form>
                    {(add.errors as Record<string, string>).name && <p role="alert" className="text-sm font-bold text-red-700">{(add.errors as Record<string, string>).name}</p>}
                    <details>
                        <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-brand-dark">{t('guest.import')}</summary>
                        <textarea rows={4} className={`${inputCls} mt-2`} value={bulk.data.text} onChange={(e) => bulk.setData('text', e.target.value)} placeholder={'Awa Diallo, +229 97 00 00 00\nKofi Mensah, kofi@example.com'} />
                        <Btn variant="ghost" className="mt-2" disabled={!bulk.data.text.trim()} onClick={() => bulk.post(route('guests.import', ev.id), { preserveScroll: true, onSuccess: () => bulk.reset() })}>
                            <Icon n="upload" />{t('guest.import_btn')}
                        </Btn>
                    </details>
                </>
            )}
            {live && pending.length > 0 && (
                <div className="rounded-2xl bg-cream/60 p-4">
                    <p className="mb-2 text-sm font-bold"><Icon n="notifications_active" /> {t('guest.nudge')}</p>
                    <div className="flex flex-wrap gap-2">
                        {pending.map((g) => (
                            <ExtBtn key={g.id} className="min-h-10" href={whatsappUrl(t('msg.nudge', { name: g.name, title: ev.title, link: g.url }), g.phone)}>{g.name}</ExtBtn>
                        ))}
                    </div>
                </div>
            )}
            {guests.length === 0 ? (
                <Empty icon="group_add" title={t('guest.empty')} hint={t('guest.empty_hint')} />
            ) : (
                <ul className="divide-y divide-ink/10">
                    {guests.map((g) => (
                        <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span className="font-bold">{g.name} <span className={`font-normal ${tone(g)}`}>· {status(g)}</span></span>
                            <span className="flex flex-wrap items-center gap-2">
                                {can.update ? (
                                    <input aria-label={t('guest.table_of', { name: g.name })} placeholder={t('guest.table')} defaultValue={g.table ?? ''} className="min-h-10 w-24 rounded-xl border-2 border-ink/15 px-2 text-sm focus:border-brand focus:ring-0"
                                        onBlur={(e) => e.target.value !== (g.table ?? '') && router.patch(route('guests.update', [ev.id, g.id]), { table: e.target.value }, { preserveScroll: true })} />
                                ) : g.table && <Pill tone="warn">{t('guest.table')} {g.table}</Pill>}
                                {live && (
                                    <>
                                        <CopyButton text={g.url} className="min-h-10 px-3" label={undefined} />
                                        <ExtBtn className="min-h-10 px-3" aria-label={`WhatsApp ${g.name}`} href={whatsappUrl(`${msg(g.name)} ${g.url}`, g.phone)}><Icon n="send" /></ExtBtn>
                                        {g.email && <ExtBtn className="min-h-10 px-3" target="_self" aria-label={`E-mail ${g.name}`} href={mailUrl(ev.title, `${msg(g.name)} ${g.url}`, g.email)}><Icon n="mail" /></ExtBtn>}
                                    </>
                                )}
                                {can.update && (
                                    <Btn variant="danger" className="min-h-10 px-3" aria-label={`${t('common.delete')} ${g.name}`}
                                        onClick={() => confirm(t('guest.delete_confirm', { name: g.name })) && router.delete(route('guests.destroy', [ev.id, g.id]), { preserveScroll: true })}>
                                        <Icon n="delete" />
                                    </Btn>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function ResponsesTab({ event: ev, rsvps }: Props) {
    const { t, locale } = useT();
    const exportCsv = () =>
        downloadCsv(`kwabor-${ev.id}.csv`, [
            [t('csv.name'), t('csv.answer'), t('csv.number'), t('csv.companions'), t('csv.contact'), t('csv.note'), t('csv.paid'), t('csv.arrived')],
            ...rsvps.map((r) => [r.name, r.answer === 'yes' ? t('common.yes') : t('common.no'), r.number ?? '', r.companions, r.contact ?? '', r.note ?? '', r.payment_status === 'paid' ? t('common.yes') : '', r.scanned_at ? t('common.yes') : '']),
        ]);
    return (
        <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <H2>{t('resp.title')}</H2>
                {rsvps.length > 0 && <Btn variant="ghost" className="min-h-10" onClick={exportCsv}><Icon n="download" />{t('resp.export')}</Btn>}
            </div>
            {rsvps.length === 0 ? (
                <p className="mt-3 text-ink/70">{t('resp.none')}</p>
            ) : (
                <ul className="mt-3 divide-y divide-ink/10">
                    {rsvps.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <span>
                                <b>{r.name || t('common.guest')}</b> ·{' '}
                                {r.answer === 'yes'
                                    ? <span className="text-green-800">{t('resp.badge', { n: pad(r.number) })}{r.companions ? ` (+${r.companions})` : ''}</span>
                                    : <span className="text-red-800">{t('common.no')}</span>}
                                {r.payment_status === 'paid' && <> · <Pill tone="ok">{t('resp.paid')}</Pill></>}
                                {r.payment_status === 'pending' && <> · <Pill tone="warn">{t('resp.pending_pay')}</Pill></>}
                                {r.scanned_at && <> · <Pill tone="ok"><Icon n="login" />{t('resp.arrived')}</Pill></>}
                                {r.table && <span className="text-ink/70"> · {t('guest.table')} {r.table}</span>}
                                {r.note && <i className="block text-sm text-ink/70">« {r.note} »</i>}
                            </span>
                            {r.answer === 'yes' && r.payment_status !== 'pending' && isPhone(r.contact) && (
                                <ExtBtn className="min-h-10" href={whatsappUrl(t('msg.reminder', { title: ev.title, date: fmtDate(ev.starts_at, locale), place: ev.location }), r.contact)}>
                                    <Icon n="notifications_active" />{t('resp.remind')}
                                </ExtBtn>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function GiftsTab({ gifts }: { gifts: Props['gifts'] }) {
    const { t } = useT();
    return (
        <Card>
            <H2>{t('gift.title')}</H2>
            {gifts.length === 0 ? (
                <p className="mt-3 text-ink/70">{t('gift.none')}</p>
            ) : (
                <ul className="mt-3 divide-y divide-ink/10">
                    {gifts.map((g) => (
                        <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <b>{g.url ? <a className="text-brand-dark underline" href={g.url} target="_blank" rel="noreferrer">{g.label}</a> : g.label}</b>
                            {g.claimed_by ? <Pill tone="ok"><Icon n="redeem" />{t('gift.claimed_by', { name: g.claimed_by })}</Pill> : <span className="text-ink/60">{t('gift.available')}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function PhotosTab({ event: ev, photos, albumUrl, rsvps }: Props) {
    const { t, locale } = useT();
    const [busy, setBusy] = useState(false);
    const phones = rsvps.filter((r) => r.answer === 'yes' && r.payment_status !== 'pending' && isPhone(r.contact));

    const upload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = [...(e.target.files ?? [])].slice(0, 30);
        e.target.value = '';
        if (!files.length) return;
        setBusy(true);
        const resized = await Promise.all(files.map((f) => resizeImage(f)));
        router.post(route('events.photos.store', ev.id), { photos: resized }, { forceFormData: true, preserveScroll: true, onFinish: () => setBusy(false) });
    };

    return (
        <Card className="space-y-4">
            <div>
                <H2>{t('photo.title')}</H2>
                <p className="text-sm text-ink/70">{t('photo.hint', { n: ev.photo_retention_days, date: fmtDay(ev.album_expires_at, locale) })}</p>
            </div>
            <label className={`${btnCls('ghost')} w-full sm:w-auto ${busy ? 'opacity-50' : ''}`}>
                <Icon n="add_photo_alternate" />{busy ? t('photo.uploading') : t('photo.add')}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={upload} />
            </label>
            {photos.length === 0 ? (
                <p className="text-ink/70">{t('photo.none')}</p>
            ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {photos.map((ph, i) => (
                        <div key={ph.id} className="relative">
                            <img src={ph.src} alt={t('photo.alt', { n: i + 1 })} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                            <button aria-label={t('common.delete')} className="absolute right-1 top-1 grid size-9 cursor-pointer place-items-center rounded-full bg-ink/80 text-white"
                                onClick={() => confirm(t('photo.delete_confirm')) && router.delete(route('events.photos.destroy', [ev.id, ph.id]), { preserveScroll: true })}>
                                <Icon n="close" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {photos.length > 0 && (
                <div className="space-y-3 rounded-2xl bg-cream/60 p-4">
                    <p className="font-bold">{t('photo.send_title')}</p>
                    <div className="flex flex-wrap gap-2">
                        <CopyButton variant="primary" text={albumUrl} label={t('photo.copy_link')} />
                        <Btn variant="ghost" onClick={() => confirm(t('photo.email_confirm')) && router.post(route('events.album.send', ev.id), {}, { preserveScroll: true })}>
                            <Icon n="mail" />{t('photo.email_all')}
                        </Btn>
                    </div>
                    {phones.length > 0 && (
                        <div>
                            <p className="mb-1 text-sm text-ink/70">{t('photo.whatsapp_hint')}</p>
                            <div className="flex flex-wrap gap-2">
                                {phones.map((r) => (
                                    <ExtBtn key={r.id} className="min-h-10" href={whatsappUrl(t('msg.album', { title: ev.title, link: albumUrl }), r.contact)}><Icon n="send" />{r.name || t('common.guest')}</ExtBtn>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
