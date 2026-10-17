import Checkbox from '@/Components/Checkbox';
import GoogleButton from '@/Components/GoogleButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword: boolean }) {
    const { t } = useT();
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', password: '', remember: false as boolean });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title={t('auth.login')} />
            <h1 className="font-display text-3xl font-extrabold">{t('auth.login')}</h1>
            {status && <div className="mt-3 text-sm font-bold text-green-800">{status}</div>}

            <div className="mt-5"><GoogleButton label={t('auth.google_login')} /></div>
            <p className="my-4 text-center text-xs uppercase tracking-wide text-ink/60">{t('auth.or')}</p>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="email" value={t('auth.email')} />
                    <TextInput id="email" type="email" value={data.email} className="mt-1" autoComplete="username" isFocused
                        onChange={(e) => setData('email', e.target.value)} />
                    <InputError message={errors.email} className="mt-1" />
                </div>
                <div>
                    <InputLabel htmlFor="password" value={t('auth.password')} />
                    <TextInput id="password" type="password" value={data.password} className="mt-1" autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)} />
                    <InputError message={errors.password} className="mt-1" />
                </div>
                <label className="flex items-center gap-2">
                    <Checkbox name="remember" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} />
                    <span className="text-sm">{t('auth.remember')}</span>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {canResetPassword && (
                        <Link href={route('password.request')} className="text-sm font-bold text-brand-dark underline">{t('auth.forgot')}</Link>
                    )}
                    <PrimaryButton disabled={processing}>{t('auth.login')}</PrimaryButton>
                </div>
            </form>
            <p className="mt-6 text-center text-sm">
                {t('auth.no_account')}{' '}
                <Link href={route('register')} className="font-bold text-brand-dark underline">{t('auth.register')}</Link>
            </p>
        </GuestLayout>
    );
}
