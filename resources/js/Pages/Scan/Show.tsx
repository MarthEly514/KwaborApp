import { Btn, Icon, inputCls } from '@/Components/ui';
import { fmtTime, pad } from '@/lib/format';
import { useT } from '@/lib/i18n';
import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import jsQR from 'jsqr';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
    token: string;
    label: string;
    event: { title: string; theme: string };
    open: boolean;
    counts: { arrived: number; expected: number };
}
interface Result {
    status: 'ok' | 'used' | 'invalid' | 'closed';
    name?: string; companions?: number; people?: number; number?: number; table?: string | null; at?: string;
    arrived?: number; expected?: number;
}
interface Hit { id: number; name: string; number: number; companions: number; table: string | null; scanned: boolean }

const PREFIX = 'kwabor:';

/** Door-staff screen: no account, no guest list — only what is needed to let the right number of people in. */
export default function Show({ token, label, event, open, counts: initial }: Props) {
    const { t, locale } = useT();
    const [counts, setCounts] = useState(initial);
    const [result, setResult] = useState<Result | null>(null);
    const [camera, setCamera] = useState<'off' | 'on' | 'error'>('off');
    const [q, setQ] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);
    const video = useRef<HTMLVideoElement>(null);
    const last = useRef({ code: '', at: 0 });

    const show = useCallback((r: Result) => {
        setResult(r);
        if (r.arrived !== undefined && r.expected !== undefined) setCounts({ arrived: r.arrived, expected: r.expected });
        navigator.vibrate?.(r.status === 'ok' ? 80 : [120, 60, 120]);
    }, []);

    const post = useCallback(async (path: string, body: object) => {
        try {
            show((await axios.post(`/scan/${token}/${path}`, body)).data);
        } catch (e) {
            const data = axios.isAxiosError(e) ? e.response?.data : null;
            show(data?.status ? data : { status: 'invalid' });
        }
    }, [token, show]);

    // Camera loop: decode ~8 frames/s, ignore the same code for 4 s so a lingering QR is not rescanned.
    useEffect(() => {
        if (camera !== 'on') return;
        let stream: MediaStream | undefined;
        let raf = 0;
        let stopped = false;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        let tick = 0;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => {
            if (stopped) return s.getTracks().forEach((x) => x.stop());
            stream = s;
            const v = video.current!;
            v.srcObject = s;
            v.play();
            const loop = () => {
                if (stopped) return;
                if (v.readyState >= 2 && performance.now() - tick > 120) {
                    tick = performance.now();
                    canvas.width = v.videoWidth;
                    canvas.height = v.videoHeight;
                    ctx.drawImage(v, 0, 0);
                    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                    if (hit?.data.startsWith(PREFIX)) {
                        const code = hit.data.slice(PREFIX.length);
                        if (code !== last.current.code || Date.now() - last.current.at > 4000) {
                            last.current = { code, at: Date.now() };
                            post('scan', { code });
                        }
                    }
                }
                raf = requestAnimationFrame(loop);
            };
            loop();
        }).catch(() => setCamera('error'));

        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
            stream?.getTracks().forEach((x) => x.stop());
        };
    }, [camera, post]);

    useEffect(() => {
        if (!q.trim()) return setHits([]);
        const id = setTimeout(() => axios.get(`/scan/${token}/search`, { params: { q } }).then((r) => setHits(r.data)), 250);
        return () => clearTimeout(id);
    }, [q, token]);

    const tone = result?.status === 'ok' ? 'bg-green-700 text-white' : result?.status === 'used' ? 'bg-amber text-ink' : 'bg-red-800 text-white';
    const pct = counts.expected ? (counts.arrived / counts.expected) * 100 : 0;

    return (
        <PublicLayout>
            <Head title={t('scan.title')} />
            <div className="space-y-4">
                <div>
                    <h1 className="font-display text-3xl font-extrabold">{event.title}</h1>
                    <p className="text-sm text-ink/70">{t('scan.door', { label })}</p>
                </div>

                <div className="rounded-3xl bg-white p-4 shadow-sm" aria-live="polite">
                    <p className="font-display text-5xl font-extrabold">{counts.arrived} <span className="text-2xl text-ink/60">{t('checkin.of', { n: counts.expected })}</span></p>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10"><div className="h-full bg-green-600 transition-all" style={{ width: `${pct}%` }} /></div>
                </div>

                {!open ? (
                    <p role="alert" className="rounded-3xl bg-red-100 p-5 text-center font-bold text-red-900"><Icon n="lock" /> {t('scan.closed')}</p>
                ) : (
                    <>
                        {result && (
                            <div role="alert" className={`rounded-3xl p-6 text-center shadow-lg ${tone}`}>
                                <Icon n={result.status === 'ok' ? 'check_circle' : result.status === 'used' ? 'warning' : 'cancel'} className="text-6xl" />
                                <p className="mt-1 font-display text-3xl font-extrabold">
                                    {result.status === 'ok' && t('scan.ok', { name: result.name ?? '' })}
                                    {result.status === 'used' && t('scan.used', { time: result.at ? fmtTime(result.at, locale) : '' })}
                                    {result.status === 'invalid' && t('scan.invalid')}
                                    {result.status === 'closed' && t('scan.closed')}
                                </p>
                                {result.name && result.status !== 'ok' && <p className="mt-1 text-xl font-bold">{result.name}</p>}
                                {result.people !== undefined && (
                                    <p className="mt-2 text-2xl font-bold">
                                        {result.companions ? t('scan.with', { n: result.companions, total: result.people }) : t('scan.alone')}
                                    </p>
                                )}
                                {result.number !== undefined && (
                                    <p className="mt-1 opacity-90">#{pad(result.number)}{result.table ? ` · ${t('guest.table')} ${result.table}` : ''}</p>
                                )}
                                <Btn variant="dark" className="mt-4" onClick={() => setResult(null)}>{t('scan.next')}</Btn>
                            </div>
                        )}

                        <div className="overflow-hidden rounded-3xl bg-ink">
                            {camera === 'on' ? (
                                <video ref={video} playsInline muted className="aspect-square w-full object-cover" aria-label={t('scan.camera')} />
                            ) : (
                                <div className="grid aspect-video place-items-center p-6 text-center text-cream">
                                    <div>
                                        <Icon n="qr_code_scanner" className="text-6xl" />
                                        {camera === 'error' && <p role="alert" className="mt-2 font-bold">{t('scan.camera_error')}</p>}
                                        <Btn className="mt-3" onClick={() => setCamera('on')}><Icon n="photo_camera" />{t('scan.start')}</Btn>
                                    </div>
                                </div>
                            )}
                        </div>
                        {camera === 'on' && <Btn variant="ghost" className="w-full" onClick={() => setCamera('off')}><Icon n="videocam_off" />{t('scan.stop')}</Btn>}

                        <div className="space-y-2 rounded-3xl bg-white p-4 shadow-sm">
                            <label className="block text-sm font-bold" htmlFor="q">{t('scan.manual')}</label>
                            <input id="q" className={inputCls} placeholder={t('checkin.search')} value={q} onChange={(e) => setQ(e.target.value)} />
                            <ul className="space-y-2">
                                {hits.map((h) => (
                                    <li key={h.id} className="flex items-center justify-between gap-2 rounded-2xl border-2 border-ink/15 p-3">
                                        <span>
                                            <b>{h.name}</b>
                                            <span className="block text-sm text-ink/70">#{pad(h.number)}{h.companions ? ` · +${h.companions}` : ''}{h.table ? ` · ${t('guest.table')} ${h.table}` : ''}</span>
                                        </span>
                                        <Btn variant={h.scanned ? 'ghost' : 'primary'} className="min-h-10 shrink-0" onClick={() => post('admit', { rsvp_id: h.id }).then(() => setQ(''))}>
                                            {h.scanned ? t('scan.already') : t('checkin.admit')}
                                        </Btn>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </PublicLayout>
    );
}
