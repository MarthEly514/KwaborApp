import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Btn, Card, H2 } from '@/Components/ui';
import { useT } from '@/lib/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Edit({ mustVerifyEmail, hasPassword }: { mustVerifyEmail: boolean; hasPassword: boolean }) {
    const { t } = useT();
    const user = usePage().props.auth.user;

    const info = useForm({ name: user.name, email: user.email });
    const pwd = useForm({ current_password: '', password: '', password_confirmation: '' });
    const del = useForm({ password: '' });

    const saveInfo: FormEventHandler = (e) => { e.preventDefault(); info.patch(route('profile.update'), { preserveScroll: true }); };
    const savePwd: FormEventHandler = (e) => {
        e.preventDefault();
        pwd.put(route('password.update'), { preserveScroll: true, onSuccess: () => pwd.reset(), onError: () => pwd.reset('password', 'password_confirmation') });
    };
    const remove: FormEventHandler = (e) => {
        e.preventDefault();
        if (confirm(t('profile.delete_confirm'))) del.delete(route('profile.destroy'), { preserveScroll: true });
    };

    const row = (form: any, id: string, label: string, type = 'text', auto?: string) => (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <TextInput id={id} type={type} className="mt-1" autoComplete={auto} value={form.data[id]} onChange={(e) => form.setData(id, e.target.value)} />
            <InputError message={form.errors[id]} className="mt-1" />
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title={t('profile.title')} />
            <div className="mx-auto max-w-xl space-y-6">
                <h1 className="font-display text-4xl font-extrabold">{t('profile.title')}</h1>

                <Card>
                    <H2>{t('profile.info')}</H2>
                    <form onSubmit={saveInfo} className="mt-4 space-y-4">
                        {row(info, 'name', t('auth.name'), 'text', 'name')}
                        {row(info, 'email', t('auth.email'), 'email', 'username')}
                        {mustVerifyEmail && user.email_verified_at === null && (
                            <p className="text-sm">
                                {t('profile.unverified')}{' '}
                                <Link href={route('verification.send')} method="post" as="button" className="font-bold text-brand-dark underline">{t('auth.verify_resend')}</Link>
                            </p>
                        )}
                        <PrimaryButton disabled={info.processing}>{t('common.save')}</PrimaryButton>
                        {info.recentlySuccessful && <span role="status" className="ms-3 text-sm font-bold text-green-800">{t('common.saved')}</span>}
                    </form>
                </Card>

                <Card>
                    <H2>{hasPassword ? t('profile.password') : t('profile.set_password')}</H2>
                    <form onSubmit={savePwd} className="mt-4 space-y-4">
                        {hasPassword && row(pwd, 'current_password', t('profile.current_password'), 'password', 'current-password')}
                        {row(pwd, 'password', t('auth.new_password'), 'password', 'new-password')}
                        {row(pwd, 'password_confirmation', t('auth.password_confirm'), 'password', 'new-password')}
                        <PrimaryButton disabled={pwd.processing}>{t('common.save')}</PrimaryButton>
                        {pwd.recentlySuccessful && <span role="status" className="ms-3 text-sm font-bold text-green-800">{t('common.saved')}</span>}
                    </form>
                </Card>

                <Card>
                    <H2 className="text-red-800">{t('profile.delete')}</H2>
                    <p className="mt-2 text-sm text-ink/80">{t('profile.delete_help')}</p>
                    <form onSubmit={remove} className="mt-4 space-y-4">
                        {hasPassword && row(del, 'password', t('auth.password'), 'password', 'current-password')}
                        <Btn variant="danger" type="submit">{t('profile.delete')}</Btn>
                    </form>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
