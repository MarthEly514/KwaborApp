import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useT();
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title={t('auth.forgot')} />
            <h1 className="font-display text-3xl font-extrabold">{t('auth.forgot')}</h1>
            <p className="mt-2 text-sm text-ink/80">{t('auth.forgot_help')}</p>
            {status && <div className="mt-3 text-sm font-bold text-green-800">{status}</div>}
            <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                    <InputLabel htmlFor="email" value={t('auth.email')} />
                    <TextInput id="email" type="email" value={data.email} className="mt-1" isFocused onChange={(e) => setData('email', e.target.value)} />
                    <InputError message={errors.email} className="mt-1" />
                </div>
                <div className="flex items-center justify-between gap-3">
                    <Link href={route('login')} className="text-sm font-bold text-brand-dark underline">{t('auth.login')}</Link>
                    <PrimaryButton disabled={processing}>{t('auth.send_link')}</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
