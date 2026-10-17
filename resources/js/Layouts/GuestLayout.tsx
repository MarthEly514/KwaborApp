import { LangSwitch, Logo } from '@/Components/ui';
import { PropsWithChildren } from 'react';

/** Shell for sign-in / sign-up screens. */
export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
            <div className="mb-6 flex w-full max-w-md items-center justify-between">
                <Logo />
                <LangSwitch />
            </div>
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8">{children}</div>
        </div>
    );
}
