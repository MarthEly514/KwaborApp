import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const { t } = useT();
    const { data, setData, post, processing, errors, reset } = useForm({ token, email, password: '', password_confirmation: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <GuestLayout>
            <Head title={t('auth.reset')} />
            <h1 className="font-display text-3xl font-extrabold">{t('auth.reset')}</h1>
            <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                    <InputLabel htmlFor="email" value={t('auth.email')} />
                    <TextInput id="email" type="email" value={data.email} className="mt-1" autoComplete="username" onChange={(e) => setData('email', e.target.value)} />
                    <InputError message={errors.email} className="mt-1" />
                </div>
                <div>
                    <InputLabel htmlFor="password" value={t('auth.new_password')} />
                    <TextInput id="password" type="password" value={data.password} className="mt-1" autoComplete="new-password" isFocused onChange={(e) => setData('password', e.target.value)} />
                    <InputError message={errors.password} className="mt-1" />
                </div>
                <div>
                    <InputLabel htmlFor="password_confirmation" value={t('auth.password_confirm')} />
                    <TextInput id="password_confirmation" type="password" value={data.password_confirmation} className="mt-1" autoComplete="new-password" onChange={(e) => setData('password_confirmation', e.target.value)} />
                    <InputError message={errors.password_confirmation} className="mt-1" />
                </div>
                <div className="flex justify-end"><PrimaryButton disabled={processing}>{t('auth.reset')}</PrimaryButton></div>
            </form>
        </GuestLayout>
    );
}
