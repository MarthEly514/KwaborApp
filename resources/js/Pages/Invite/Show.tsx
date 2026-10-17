import InvitationCard from '@/Components/InvitationCard';
import { Btn, Card, ExtBtn, Field, H2, Icon, LinkBtn, Pill, Reveal, inputCls } from '@/Components/ui';
import { fmtDate, fmtXof, pad } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { downloadIcs, mapsEmbed, mapsUrl } from '@/lib/share';
import { themeOf } from '@/lib/themes';
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEventHandler, useState } from 'react';

interface Props {
    event: {
        id: number; title: string; host: string; location: string; description: string | null; theme: string; price_xof: number;
        max_companions: number; question: string | null; capacity: number | null; starts_at: string; rsvp_deadline_at: string | null;
    };
    state: 'open' | 'closed' | 'full' | 'ended';
    spotsLeft: number | null;
    payUrl: string | null;
    guestName: string | null;
    token: string;
    preview: boolean;
    rsvp: { answer: 'yes' | 'no'; name: string; companions: number; number: number | null; payment_status: string; ticket_code: string | null; scanned_at: string | null } | null;
    gifts: { id: number; label: string; url: string | null; claimed: boolean; mine: boolean }[];
    albumUrl: string | null;
}

export default function Show(p: Props) {
    const { t, locale } = useT();
    const { event: ev, rsvp, state, preview } = p;
    const errors = usePage().props.errors as Record<string, string>;
    const th = themeOf(ev.theme);
    const [form, setForm] = useState<'ask' | 'yes' | 'edit'>('ask');
    const [name, setName] = useState(p.guestName ?? rsvp?.name ?? '');
    const [companions, setCompanions] = useState(rsvp?.companions ?? 0);
    const [note, setNote] = useState('');
    const [contact, setContact] = useState('');
    const [busy, setBusy] = useState(false);

    const paid = ev.price_xof > 0;
    const maxExtra = Math.min(ev.max_companions, p.spotsLeft === null ? ev.max_companions : Math.max(0, p.spotsLeft - 1));
    const confirmed = rsvp?.answer === 'yes' && (rsvp.payment_status === 'free' || rsvp.payment_status === 'paid');
    const awaitingPayment = rsvp?.answer === 'yes' && rsvp.payment_status === 'pending' && !!p.payUrl;
    const canAnswer = state === 'open' && !preview;
    const total = ev.price_xof * (1 + companions);
    const rsvpError = errors.rsvp ? t(`err.${errors.rsvp}`) : null;

    const send = (answer: 'yes' | 'no', extra: object = {}) => {
        setBusy(true);
        router.post(route('invite.rsvp', p.token), { answer, name, ...extra }, {
            preserveScroll: true,
            onSuccess: () => setForm('ask'),
            onFinish: () => setBusy(false),
        });
    };
    const submitYes: FormEventHandler = (e) => {
        e.preventDefault();
        send('yes', { companions, note: note || null, contact: contact || null });
    };
    const claim = (id: number) =>
        router.post(route('invite.claim', [p.token, id]), { name }, { preserveScroll: true });

    const askName = !p.guestName;

    return (
        <PublicLayout>
            <Head title={ev.title} />
            <Reveal className="space-y-6">
                {preview && (
                    <p data-reveal role="status" className="rounded-2xl bg-ink px-4 py-3 text-center text-sm font-bold text-cream">
                        <Icon n="visibility" /> {t('invite.preview_banner')}
                    </p>
                )}
                <div data-reveal>
                    <InvitationCard title={ev.title} host={ev.host} startsAt={ev.starts_at} location={ev.location} description={ev.description} theme={ev.theme} price={ev.price_xof} guest={p.guestName}>
                        {(p.spotsLeft !== null || ev.rsvp_deadline_at) && (
                            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                                {p.spotsLeft !== null && (
                                    <span className="rounded-full px-3 py-1" style={{ background: th.soft, color: '#2B1708' }}>
                                        <Icon n="groups" /> {p.spotsLeft === 0 ? t('invite.full_chip') : t('invite.spots', { n: p.spotsLeft })}
                                    </span>
                                )}
                                {ev.rsvp_deadline_at && (
                                    <span className="rounded-full px-3 py-1" style={{ background: th.soft, color: '#2B1708' }}>
                                        <Icon n="timer" /> {t('invite.before', { date: fmtDate(ev.rsvp_deadline_at, locale) })}
                                    </span>
                                )}
                            </div>
                        )}
                    </InvitationCard>
                </div>

                {rsvpError && <p data-reveal role="alert" className="rounded-2xl bg-red-100 p-3 text-center font-bold text-red-900">{rsvpError}</p>}

                {/* ---- no answer yet -------------------------------------------------- */}
                {!rsvp && state === 'open' && form === 'ask' && (
                    <div data-reveal className="text-center">
                        <H2>{t('invite.question')}</H2>
                        <div className="mt-4 flex justify-center gap-3">
                            <Btn disabled={!canAnswer || busy} onClick={() => setForm('yes')}><Icon n="check" />{t('invite.yes')}</Btn>
                            <Btn variant="ghost" disabled={!canAnswer || busy} onClick={() => send('no')}><Icon n="close" />{t('invite.no')}</Btn>
                        </div>
                    </div>
                )}
                {!rsvp && state === 'closed' && <Notice icon="lock_clock" text={t('invite.closed')} />}
                {!rsvp && state === 'full' && <Notice icon="group_off" text={t('invite.full')} />}
                {!rsvp && state === 'ended' && <Notice icon="event_busy" text={t('invite.ended')} />}

                {/* ---- the "yes" form (new answer, or editing companions) --------------- */}
                {((!rsvp && form === 'yes') || form === 'edit') && canAnswer && (
                    <form data-reveal onSubmit={submitYes} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
                        {askName && (
                            <Field label={t('invite.name')} error={errors.name}>
                                <input required className={inputCls} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                            </Field>
                        )}
                        {maxExtra > 0 && (
                            <Field label={t('invite.companions')} hint={t('invite.companions_hint')} error={errors.companions}>
                                <select className={inputCls} value={companions} onChange={(e) => setCompanions(+e.target.value)}>
                                    {Array.from({ length: maxExtra + 1 }, (_, n) => <option key={n} value={n}>{n === 0 ? t('invite.alone') : `+${n}`}</option>)}
                                </select>
                            </Field>
                        )}
                        {ev.question && (
                            <Field label={ev.question}><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                        )}
                        {form !== 'edit' && (
                            <Field label={t('invite.contact')} hint={t('invite.contact_hint')}>
                                <input className={inputCls} value={contact} inputMode="email" autoComplete="email" placeholder="+229 … / nom@mail.com" onChange={(e) => setContact(e.target.value)} />
                            </Field>
                        )}
                        {paid && (
                            <p className="rounded-2xl bg-cream/60 p-3 text-sm font-bold">
                                <Icon n="payments" /> {t('invite.total', { n: 1 + companions, total: fmtXof(total, locale, '') })}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Btn type="submit" className="flex-1" disabled={busy}><Icon n={paid ? 'arrow_forward' : 'check'} />{paid ? t('invite.to_payment') : t('invite.confirm')}</Btn>
                            <Btn variant="ghost" onClick={() => setForm('ask')}>{t('common.cancel')}</Btn>
                        </div>
                    </form>
                )}

                {/* ---- answered: no ------------------------------------------------------ */}
                {rsvp?.answer === 'no' && (
                    <div data-reveal className="space-y-3 text-center">
                        <Notice icon="sentiment_neutral" text={t('invite.thanks_no')} />
                        {canAnswer && <Btn variant="ghost" onClick={() => { setForm('yes'); router.reload({ only: [] }); }}><Icon n="undo" />{t('invite.change')}</Btn>}
                    </div>
                )}

                {/* ---- answered: yes, waiting for payment ------------------------------ */}
                {awaitingPayment && (
                    <div data-reveal className="space-y-3 rounded-3xl bg-sun/40 p-6 text-center">
                        <p className="font-bold"><Icon n="hourglass_top" /> {t('invite.pending_payment')}</p>
                        <LinkBtn href={p.payUrl!}><Icon n="lock" />{t('invite.resume_payment')}</LinkBtn>
                    </div>
                )}

                {/* ---- answered: yes, confirmed: badge + ticket ----------------------- */}
                {confirmed && rsvp && (
                    <div data-reveal className="space-y-4">
                        <div className="rounded-3xl p-6 text-center shadow-lg" style={{ background: th.accent, color: '#2B1708' }}>
                            <Icon n="verified" className="text-5xl" />
                            <p className="font-display text-4xl font-extrabold">{t('invite.badge_title')}</p>
                            <p className="mt-1 text-lg font-bold">{rsvp.name || t('common.guest')} · {t('invite.badge_n', { n: pad(rsvp.number) })}</p>
                            {rsvp.companions > 0 && <p className="font-bold">+{rsvp.companions} {rsvp.companions > 1 ? t('invite.companions_many') : t('invite.companions_one')}</p>}
                        </div>

                        <Card className="text-center">
                            <H2>{paid ? t('invite.ticket') : t('invite.pass')}</H2>
                            {rsvp.scanned_at ? (
                                <p className="mt-3"><Pill tone="ok"><Icon n="login" />{t('invite.scanned')}</Pill></p>
                            ) : (
                                <>
                                    <div className="mt-3 inline-block rounded-2xl border-4 border-ink bg-white p-3">
                                        <QRCodeSVG value={`kwabor:${rsvp.ticket_code}`} size={192} marginSize={1} />
                                    </div>
                                    <p className="mt-2 text-sm text-ink/70">{rsvp.companions ? t('invite.qr_hint_group', { n: rsvp.companions + 1 }) : t('invite.qr_hint')}</p>
                                </>
                            )}
                        </Card>

                        <div className="grid gap-2 sm:grid-cols-2">
                            <Btn variant="dark" onClick={() => downloadIcs(ev.title, ev.starts_at, ev.location)}><Icon n="event_available" />{t('invite.calendar')}</Btn>
                            <ExtBtn href={mapsUrl(ev.location)}><Icon n="directions" />{t('invite.directions')}</ExtBtn>
                        </div>
                        {canAnswer && !rsvp.scanned_at && (
                            <div className="flex flex-wrap justify-center gap-2">
                                {rsvp.payment_status === 'free' && maxExtra + rsvp.companions > 0 && (
                                    <Btn variant="ghost" onClick={() => { setCompanions(rsvp.companions); setForm('edit'); }}><Icon n="group_add" />{t('invite.edit_companions')}</Btn>
                                )}
                                {rsvp.payment_status === 'free' && <Btn variant="ghost" disabled={busy} onClick={() => confirm(t('invite.cancel_confirm')) && send('no')}><Icon n="close" />{t('invite.cancel')}</Btn>}
                                {rsvp.payment_status === 'paid' && <p className="text-center text-sm text-ink/70">{t('invite.paid_locked')}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* ---- gifts ---------------------------------------------------------- */}
                {p.gifts.length > 0 && (
                    <Card>
                        <H2><Icon n="redeem" /> {t('invite.gifts')}</H2>
                        <p className="text-sm text-ink/70">{t('invite.gifts_hint')}</p>
                        {errors.gift && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{t('err.taken')}</p>}
                        {!p.guestName && !rsvp?.name && !p.preview && (
                            <div className="mt-3"><Field label={t('invite.name')}><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
                        )}
                        <ul className="mt-3 divide-y divide-ink/10">
                            {p.gifts.map((g) => (
                                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                    <span className="font-bold">{g.url ? <a className="text-brand-dark underline" href={g.url} target="_blank" rel="noreferrer">{g.label}</a> : g.label}</span>
                                    {g.claimed && !g.mine ? (
                                        <span className="text-sm text-ink/60">{t('invite.gift_taken')}</span>
                                    ) : (
                                        <Btn variant={g.mine ? 'dark' : 'ghost'} className="min-h-10" disabled={preview || (!g.mine && !name.trim() && !p.guestName)} onClick={() => claim(g.id)}>
                                            <Icon n={g.mine ? 'check' : 'redeem'} />{g.mine ? t('invite.gift_release') : t('invite.gift_offer')}
                                        </Btn>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}

                <section data-reveal className="overflow-hidden rounded-3xl bg-white shadow-sm">
                    <iframe title={t('invite.map')} src={mapsEmbed(ev.location)} loading="lazy" className="h-56 w-full border-0" referrerPolicy="no-referrer-when-downgrade" />
                    <ExtBtn variant="ghost" href={mapsUrl(ev.location)} className="m-3 !flex"><Icon n="directions" />{t('invite.directions')}</ExtBtn>
                </section>

                {p.albumUrl && (
                    <LinkBtn data-reveal href={p.albumUrl} variant="dark" className="w-full"><Icon n="photo_library" />{t('invite.album')}</LinkBtn>
                )}
            </Reveal>
        </PublicLayout>
    );
}

const Notice = ({ icon, text }: { icon: string; text: string }) => (
    <p data-reveal className="rounded-2xl bg-cream/60 p-4 text-center font-bold"><Icon n={icon} /> {text}</p>
);
