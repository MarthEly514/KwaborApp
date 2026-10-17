import InputError from '@/Components/InputError';
import InvitationCard from '@/Components/InvitationCard';
import { Btn, Card, Field, H2, Icon, LinkBtn, Reveal, inputCls } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { mapsUrl } from '@/lib/share';
import { THEMES } from '@/lib/themes';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Gift { id?: number; label: string; url: string }
interface EventData {
    id: number; title: string; host: string; location: string; description: string | null; theme: string; locale: string;
    price_xof: number; max_companions: number; question: string | null; capacity: number | null; photo_retention_days: number;
    starts_at_input: string; deadline_input: string | null; registry: { id: number; label: string; url: string | null }[];
}

export default function Form({ event, locks }: { event: EventData | null; locks: { price: boolean; minCapacity: number } }) {
    const { t } = useT();
    const form = useForm({
        title: event?.title ?? '',
        host: event?.host ?? '',
        starts_at: event?.starts_at_input ?? '',
        location: event?.location ?? '',
        description: event?.description ?? '',
        theme: event?.theme ?? 'soleil',
        locale: event?.locale ?? 'fr',
        price_xof: event?.price_xof ?? 0,
        max_companions: event?.max_companions ?? 0,
        question: event?.question ?? '',
        rsvp_deadline_at: event?.deadline_input ?? '',
        capacity: event?.capacity ?? '',
        photo_retention_days: event?.photo_retention_days ?? 30,
        registry: (event?.registry ?? []).map((g) => ({ id: g.id, label: g.label, url: g.url ?? '' })) as Gift[],
    });
    const { data, setData, errors } = form;
    const [paid, setPaid] = useState((event?.price_xof ?? 0) > 0);
    const [limited, setLimited] = useState(event?.capacity != null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            price_xof: paid ? d.price_xof : 0,
            capacity: limited && d.capacity !== '' ? d.capacity : null,
            rsvp_deadline_at: d.rsvp_deadline_at || null,
            registry: d.registry.filter((g) => g.label.trim()).map((g) => ({ ...g, url: g.url || null })),
        }));
        event ? form.put(route('events.update', event.id)) : form.post(route('events.store'));
    };

    const setGift = (i: number, patch: Partial<Gift>) => setData('registry', data.registry.map((g, j) => (j === i ? { ...g, ...patch } : g)));

    return (
        <AuthenticatedLayout>
            <Head title={event ? t('form.edit') : t('form.create')} />
            <Reveal className="grid gap-8 lg:grid-cols-2">
                <form onSubmit={submit} className="space-y-5">
                    <h1 data-reveal className="font-display text-4xl font-extrabold">{event ? t('form.edit') : t('form.create')}</h1>

                    <Card className="space-y-4" >
                        <H2><Icon n="edit_note" /> {t('form.essentials')}</H2>
                        <Field label={t('form.title')} error={errors.title}>
                            <input className={inputCls} required value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder={t('form.title_ph')} />
                        </Field>
                        <Field label={t('form.host')} error={errors.host}>
                            <input className={inputCls} required value={data.host} onChange={(e) => setData('host', e.target.value)} />
                        </Field>
                        <Field label={t('form.date')} error={errors.starts_at}>
                            <input type="datetime-local" required className={inputCls} value={data.starts_at} onChange={(e) => setData('starts_at', e.target.value)} />
                        </Field>
                        <div>
                            <Field label={t('form.location')} hint={t('form.location_hint')} error={errors.location}>
                                <input className={inputCls} required value={data.location} onChange={(e) => setData('location', e.target.value)} placeholder="Salle Les Palmiers, Cotonou" />
                            </Field>
                            {data.location && (
                                <a className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-dark underline" href={mapsUrl(data.location)} target="_blank" rel="noreferrer">
                                    <Icon n="map" />{t('form.check_map')}
                                </a>
                            )}
                        </div>
                        <Field label={t('form.message')} error={errors.description}>
                            <textarea rows={3} className={inputCls} value={data.description} onChange={(e) => setData('description', e.target.value)} />
                        </Field>
                    </Card>

                    <Card className="space-y-4">
                        <H2><Icon n="palette" /> {t('form.look')}</H2>
                        <fieldset>
                            <legend className="mb-2 text-sm font-bold">{t('form.colors')}</legend>
                            <div className="flex flex-wrap gap-3">
                                {THEMES.map((th) => (
                                    <button type="button" key={th.id} onClick={() => setData('theme', th.id)} aria-pressed={data.theme === th.id} aria-label={th.name} title={th.name}
                                        className={`size-12 rounded-full border-4 cursor-pointer ${data.theme === th.id ? 'scale-110 border-ink' : 'border-white shadow'}`}
                                        style={{ background: `linear-gradient(135deg, ${th.bg} 50%, ${th.accent} 50%)` }} />
                                ))}
                            </div>
                            <InputError message={errors.theme} />
                        </fieldset>
                        <fieldset>
                            <legend className="mb-2 text-sm font-bold">{t('form.language')}</legend>
                            <div className="flex gap-2">
                                {(['fr', 'en'] as const).map((l) => (
                                    <button type="button" key={l} aria-pressed={data.locale === l} onClick={() => setData('locale', l)}
                                        className={`min-h-11 rounded-full border-2 px-5 font-bold uppercase cursor-pointer ${data.locale === l ? 'border-ink bg-ink text-cream' : 'border-ink/15'}`}>{l}</button>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-ink/70">{t('form.language_hint')}</p>
                        </fieldset>
                    </Card>

                    <Card className="space-y-4">
                        <H2><Icon n="rule" /> {t('form.rules')}</H2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('form.companions')} hint={t('form.companions_hint')} error={errors.max_companions}>
                                <select className={inputCls} value={data.max_companions} onChange={(e) => setData('max_companions', +e.target.value)}>
                                    {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? t('form.none') : `+${n}`}</option>)}
                                </select>
                            </Field>
                            <Field label={t('form.question')} hint={t('form.question_hint')} error={errors.question}>
                                <input className={inputCls} value={data.question} onChange={(e) => setData('question', e.target.value)} />
                            </Field>
                        </div>
                        <Field label={t('form.deadline')} hint={t('form.deadline_hint')} error={errors.rsvp_deadline_at}>
                            <input type="datetime-local" className={inputCls} value={data.rsvp_deadline_at} max={data.starts_at || undefined} onChange={(e) => setData('rsvp_deadline_at', e.target.value)} />
                        </Field>
                        <div className="space-y-3 rounded-2xl bg-cream/60 p-4">
                            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
                                <input type="checkbox" className="size-5 rounded border-2 border-ink/30 text-brand focus:ring-brand" checked={limited} onChange={(e) => { setLimited(e.target.checked); if (e.target.checked && !data.capacity) setData('capacity', Math.max(50, locks.minCapacity)); }} />
                                {t('form.limit')}
                            </label>
                            {limited ? (
                                <Field label={t('form.capacity')} hint={locks.minCapacity ? t('form.capacity_min', { n: locks.minCapacity }) : t('form.capacity_hint')} error={errors.capacity}>
                                    <input type="number" min={Math.max(1, locks.minCapacity)} className={inputCls} value={data.capacity} onChange={(e) => setData('capacity', e.target.value === '' ? '' : +e.target.value)} />
                                </Field>
                            ) : (
                                <p className="text-sm text-ink/70">{t('form.no_limit_hint')}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="space-y-3">
                        <H2><Icon n="confirmation_number" /> {t('form.tickets')}</H2>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
                            <input type="checkbox" className="size-5 rounded border-2 border-ink/30 text-brand focus:ring-brand" checked={paid} disabled={locks.price}
                                onChange={(e) => { setPaid(e.target.checked); if (e.target.checked && !data.price_xof) setData('price_xof', 5000); }} />
                            {t('form.paid')}
                        </label>
                        {paid && (
                            <Field label={t('form.price')} hint={locks.price ? t('form.price_locked') : t('form.price_hint')} error={errors.price_xof}>
                                <input type="number" min={100} step={100} className={inputCls} disabled={locks.price} value={data.price_xof} onChange={(e) => setData('price_xof', +e.target.value)} />
                            </Field>
                        )}
                    </Card>

                    <Card className="space-y-3">
                        <H2><Icon n="redeem" /> {t('form.gifts')}</H2>
                        <p className="text-sm text-ink/70">{t('form.gifts_hint')}</p>
                        {data.registry.map((g, i) => (
                            <div key={g.id ?? `n${i}`} className="flex flex-wrap gap-2">
                                <input aria-label={t('form.gift')} placeholder={t('form.gift')} className={`${inputCls} min-w-36 flex-1`} value={g.label} onChange={(e) => setGift(i, { label: e.target.value })} />
                                <input aria-label={t('form.gift_link')} placeholder={t('form.gift_link')} inputMode="url" className={`${inputCls} min-w-36 flex-1`} value={g.url} onChange={(e) => setGift(i, { url: e.target.value })} />
                                <Btn variant="ghost" aria-label={t('common.remove')} onClick={() => setData('registry', data.registry.filter((_, j) => j !== i))}><Icon n="close" /></Btn>
                                <div className="w-full"><InputError message={(errors as Record<string, string>)[`registry.${i}.url`] ?? (errors as Record<string, string>)[`registry.${i}.label`]} /></div>
                            </div>
                        ))}
                        <Btn variant="ghost" onClick={() => setData('registry', [...data.registry, { label: '', url: '' }])}><Icon n="add" />{t('form.add_gift')}</Btn>
                    </Card>

                    <Card>
                        <H2><Icon n="photo_library" /> {t('form.album')}</H2>
                        <div className="mt-3">
                            <Field label={t('form.retention', { n: data.photo_retention_days })} hint={t('form.retention_hint')} error={errors.photo_retention_days}>
                                <input type="range" min={7} max={30} className="w-full accent-brand" value={data.photo_retention_days} onChange={(e) => setData('photo_retention_days', +e.target.value)} />
                            </Field>
                        </div>
                    </Card>

                    <div className="flex flex-wrap gap-3">
                        <Btn type="submit" disabled={form.processing} className="flex-1"><Icon n="check" />{event ? t('common.save') : t('form.create_draft')}</Btn>
                        <LinkBtn variant="ghost" href={event ? route('events.show', event.id) : route('events.index')}>{t('common.cancel')}</LinkBtn>
                    </div>
                </form>

                <div className="self-start lg:sticky lg:top-20" data-reveal>
                    <p className="mb-2 text-sm font-bold text-ink/70">{t('form.preview')}</p>
                    <InvitationCard title={data.title} host={data.host} startsAt={data.starts_at} location={data.location} description={data.description} theme={data.theme} price={paid ? data.price_xof : 0} />
                </div>
            </Reveal>
        </AuthenticatedLayout>
    );
}
