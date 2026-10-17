import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-ink/15 bg-white px-5 font-bold text-ink transition hover:bg-cream/70 active:scale-95 disabled:opacity-50 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
