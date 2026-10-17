import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'size-5 rounded border-2 border-ink/30 text-brand focus:ring-brand ' +
                className
            }
        />
    );
}
