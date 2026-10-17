import { Flash, Icon, LangSwitch, Logo } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

const NAV = [
    { href: 'dashboard', match: 'dashboard', icon: 'dashboard', label: 'nav.dashboard' },
    { href: 'events.index', match: 'events.*', icon: 'event', label: 'nav.events' },
    { href: 'account.index', match: 'account.*', icon: 'account_circle', label: 'nav.account' },
] as const;

/** Organizer shell: top bar on desktop, bottom tab bar on phones (thumb reach). */
export default function AuthenticatedLayout({ header, children }: PropsWithChildren<{ header?: ReactNode }>) {
    const { t } = useT();
    const user = usePage().props.auth.user;
    const active = (m: string) => route().current(m) || (m === 'account.*' && route().current('profile.*'));

    return (
        <div className="min-h-screen pb-24 sm:pb-0">
            <Flash />
            <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
                    <Logo />
                    <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
                        {NAV.map((n) => (
                            <Link key={n.href} href={route(n.href)} aria-current={active(n.match) ? 'page' : undefined}
                                className={`rounded-full px-4 py-2 font-bold ${active(n.match) ? 'bg-ink text-cream' : 'hover:bg-cream/70'}`}>
                                {t(n.label)}
                            </Link>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <LangSwitch />
                        <Link href={route('logout')} method="post" as="button" className="hidden min-h-11 items-center gap-1 rounded-full px-3 font-bold hover:bg-cream/70 sm:inline-flex" title={user.email}>
                            <Icon n="logout" />{t('nav.logout')}
                        </Link>
                    </div>
                </div>
            </header>
            {header && <div className="mx-auto max-w-5xl px-4 pt-6">{header}</div>}
            <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
            <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-ink/10 bg-paper/95 backdrop-blur sm:hidden" aria-label="Main">
                {NAV.map((n) => (
                    <Link key={n.href} href={route(n.href)} aria-current={active(n.match) ? 'page' : undefined}
                        className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold ${active(n.match) ? 'text-brand-dark' : 'text-ink/70'}`}>
                        <Icon n={n.icon} className="text-2xl" />{t(n.label)}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
