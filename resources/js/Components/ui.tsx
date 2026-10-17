import { useT } from '@/lib/i18n';
import { Link, router, usePage } from '@inertiajs/react';
import gsap from 'gsap';
import {
    AnchorHTMLAttributes,
    ButtonHTMLAttributes,
    ComponentProps,
    ReactNode,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

export const Icon = ({ n, className = '' }: { n: string; className?: string }) => (
    <span className={`material-symbols-rounded ${className}`} aria-hidden="true">{n}</span>
);

// Primary uses ink text on brand orange: white-on-orange fails WCAG AA for body-size text.
const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 min-h-11 font-bold transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';
const variants = {
    primary: 'bg-brand text-ink hover:bg-amber',
    dark: 'bg-ink text-cream hover:bg-black',
    ghost: 'border-2 border-ink/15 bg-white/60 hover:bg-cream/70',
    danger: 'border-2 border-red-700/30 text-red-800 hover:bg-red-50',
};
export type Variant = keyof typeof variants;
export const btnCls = (v: Variant = 'primary', extra = '') => `${base} ${variants[v]} ${extra}`;

export const Btn = ({
    variant = 'primary', className = '', type = 'button', ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) => (
    <button type={type} {...p} className={btnCls(variant, className)} />
);

export const LinkBtn = ({
    variant = 'primary', className = '', ...p
}: { variant?: Variant; className?: string } & ComponentProps<typeof Link>) => (
    <Link {...p} className={btnCls(variant, className)} />
);

export const ExtBtn = ({
    variant = 'ghost', className = '', children, ...p
}: { variant?: Variant } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a target="_blank" rel="noreferrer" {...p} className={btnCls(variant, className)}>{children}</a>
);

export const inputCls =
    'w-full rounded-xl border-2 border-ink/15 bg-white px-4 min-h-11 py-2 text-ink placeholder:text-ink/40 focus:border-brand focus:ring-0';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-bold">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-ink/70">{hint}</span>}
            {error && <span role="alert" className="mt-1 block text-sm font-bold text-red-700">{error}</span>}
        </label>
    );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <section className={`rounded-3xl bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>
);

export const H2 = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <h2 className={`font-display text-2xl font-extrabold ${className}`}>{children}</h2>
);

const pillTone = {
    draft: 'bg-ink/10 text-ink',
    published: 'bg-green-100 text-green-900',
    ended: 'bg-ink text-cream',
    warn: 'bg-sun/50 text-ink',
    ok: 'bg-green-100 text-green-900',
    bad: 'bg-red-100 text-red-900',
};
export const Pill = ({ tone, children }: { tone: keyof typeof pillTone; children: ReactNode }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${pillTone[tone]}`}>{children}</span>
);

export const Stat = ({ label, value, tone = 'text-ink' }: { label: string; value: ReactNode; tone?: string }) => (
    <div className="rounded-2xl bg-cream/60 p-3 text-center">
        <div className={`font-display text-3xl font-extrabold ${tone}`}>{value}</div>
        <div className="text-xs font-bold text-ink/70">{label}</div>
    </div>
);

export const Empty = ({ icon, title, hint, children }: { icon: string; title: string; hint?: string; children?: ReactNode }) => (
    <div className="rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
        <Icon n={icon} className="text-5xl text-brand" />
        <p className="mt-2 text-lg font-bold">{title}</p>
        {hint && <p className="text-ink/70">{hint}</p>}
        {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
);

/** Fades children marked [data-reveal] in on mount. Skipped when the user prefers reduced motion. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const ctx = gsap.context(() => {
            gsap.from('[data-reveal]', { y: 24, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'all' });
        }, ref);
        return () => ctx.revert();
    }, []);
    return <div ref={ref} className={className}>{children}</div>;
}

export function CopyButton({ text, variant = 'ghost', className = '', label }: { text: string; variant?: Variant; className?: string; label?: string }) {
    const { t } = useT();
    const [done, setDone] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = Object.assign(document.createElement('textarea'), { value: text });
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
    };
    return (
        <Btn variant={variant} className={className} onClick={copy} aria-label={label ?? t('common.copy')}>
            <Icon n={done ? 'check' : 'content_copy'} />
            {label !== undefined ? (done ? t('common.copied') : label) : null}
        </Btn>
    );
}

export function LangSwitch({ className = '' }: { className?: string }) {
    const { locale } = useT();
    return (
        <div className={`inline-flex rounded-full border-2 border-ink/15 bg-white/70 p-0.5 text-sm font-bold ${className}`} role="group" aria-label="Language">
            {(['fr', 'en'] as const).map((l) => (
                <button
                    key={l}
                    type="button"
                    aria-pressed={locale === l}
                    onClick={() => router.post(route('locale'), { locale: l }, { preserveScroll: true, preserveState: true })}
                    className={`min-h-9 min-w-10 rounded-full px-3 uppercase cursor-pointer ${locale === l ? 'bg-ink text-cream' : 'text-ink/70 hover:text-ink'}`}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}

/** Toast for server flash messages (keys under "flash.*"). */
export function Flash() {
    const { t } = useT();
    const flash = usePage().props.flash;
    const [shown, setShown] = useState<string | null>(null);
    useEffect(() => {
        if (!flash?.status) return;
        setShown(t(flash.status, { n: flash.count ?? 0 }));
        const id = setTimeout(() => setShown(null), 4000);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash]);
    if (!shown) return null;
    return (
        <div role="status" className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-center font-bold text-cream shadow-xl">
            {shown}
        </div>
    );
}

export const Logo = ({ className = '' }: { className?: string }) => (
    <Link href="/" className={`inline-flex items-center gap-1 font-display text-2xl font-extrabold text-brand-dark ${className}`}>
        <Icon n="celebration" />Kwabor
    </Link>
);
