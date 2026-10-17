import GoogleButton from '@/Components/GoogleButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Register() {
    const { t } = useT();
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', email: '', password: '', password_confirmation: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    const field = (id: 'name' | 'email' | 'password' | 'password_confirmation', label: string, type = 'text', auto?: string) => (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <TextInput id={id} type={type} value={data[id]} className="mt-1" autoComplete={auto} required
                onChange={(e) => setData(id, e.target.value)} />
            <InputError message={errors[id]} className="mt-1" />
        </div>
    );

    return (
        <GuestLayout>
            <Head title={t('auth.register')} />
            <h1 className="font-display text-3xl font-extrabold">{t('auth.register')}</h1>
            <div className="mt-5"><GoogleButton label={t('auth.google_register')} /></div>
            <p className="my-4 text-center text-xs uppercase tracking-wide text-ink/60">{t('auth.or')}</p>
            <form onSubmit={submit} className="space-y-4">
                {field('name', t('auth.name'), 'text', 'name')}
                {field('email', t('auth.email'), 'email', 'username')}
                {field('password', t('auth.password'), 'password', 'new-password')}
                {field('password_confirmation', t('auth.password_confirm'), 'password', 'new-password')}
                <div className="flex justify-end"><PrimaryButton disabled={processing}>{t('auth.register')}</PrimaryButton></div>
            </form>
            <p className="mt-6 text-center text-sm">
                {t('auth.have_account')}{' '}
                <Link href={route('login')} className="font-bold text-brand-dark underline">{t('auth.login')}</Link>
            </p>
        </GuestLayout>
    );
}
