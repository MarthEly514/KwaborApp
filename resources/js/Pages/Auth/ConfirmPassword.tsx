import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useT } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ConfirmPassword() {
    const { t } = useT();
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title={t('auth.confirm')} />
            <p className="text-sm text-ink/80">{t('auth.confirm_help')}</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                    <InputLabel htmlFor="password" value={t('auth.password')} />
                    <TextInput id="password" type="password" value={data.password} className="mt-1" isFocused onChange={(e) => setData('password', e.target.value)} />
                    <InputError message={errors.password} className="mt-1" />
                </div>
                <div className="flex justify-end"><PrimaryButton disabled={processing}>{t('auth.confirm')}</PrimaryButton></div>
            </form>
        </GuestLayout>
    );
}
