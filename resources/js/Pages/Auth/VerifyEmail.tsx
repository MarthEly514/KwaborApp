import PrimaryButton from '@/Components/PrimaryButton';
import { useT } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useT();
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title={t('auth.verify_title')} />
            <h1 className="font-display text-3xl font-extrabold">{t('auth.verify_title')}</h1>
            <p className="mt-3 text-ink/80">{t('auth.verify_help')}</p>
            {status === 'verification-link-sent' && (
                <div role="status" className="mt-4 rounded-xl bg-green-100 p-3 text-sm font-bold text-green-900">{t('auth.verify_sent')}</div>
            )}
            <form onSubmit={submit} className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <PrimaryButton disabled={processing}>{t('auth.verify_resend')}</PrimaryButton>
                <Link href={route('logout')} method="post" as="button" className="min-h-11 text-sm font-bold text-brand-dark underline">{t('nav.logout')}</Link>
            </form>
        </GuestLayout>
    );
}
