import { usePage } from '@inertiajs/react';

/** t('key', { name }) — strings live in lang/{fr,en}.json; unknown keys render as the key itself. */
export function useT() {
    const { translations, locale } = usePage().props;
    const t = (key: string, vars: Record<string, string | number> = {}) =>
        Object.entries(vars).sort(([a], [b]) => b.length - a.length).reduce( // longest first so ":name" is not clobbered by ":n"
            (s, [k, v]) => s.replaceAll(`:${k}`, String(v)),
            translations[key] ?? key,
        );
    return { t, locale };
}
