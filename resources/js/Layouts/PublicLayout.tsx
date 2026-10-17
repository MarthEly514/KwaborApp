import { Flash, LangSwitch, Logo } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import { PropsWithChildren } from 'react';

/** Shell for pages opened by guests and door staff (no account, no organizer navigation). */
export default function PublicLayout({ children, width = 'max-w-lg' }: PropsWithChildren<{ width?: string }>) {
    const { t } = useT();
    return (
        <div className="min-h-screen">
            <Flash />
            <header className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
                <Logo className="!text-xl" />
                <LangSwitch />
            </header>
            <main className={`mx-auto ${width} px-4 pb-10`}>{children}</main>
            <footer className="pb-8 text-center text-xs text-ink/60">{t('common.made_with')}</footer>
        </div>
    );
}
