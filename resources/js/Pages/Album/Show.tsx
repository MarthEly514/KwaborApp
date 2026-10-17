import { Empty, Icon, Reveal } from '@/Components/ui';
import { fmtDay } from '@/lib/format';
import { useT } from '@/lib/i18n';
import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';

interface Props {
    title: string;
    expired: boolean;
    expiresAt: string;
    photos: { id: number; src: string; download: string }[];
}

/** Guests can view and download only; uploading is the organizer's job. */
export default function Show({ title, expired, expiresAt, photos }: Props) {
    const { t, locale } = useT();
    return (
        <PublicLayout width="max-w-3xl">
            <Head title={title} />
            <Reveal>
                <h1 data-reveal className="font-display text-4xl font-extrabold">{title}</h1>
                {expired ? (
                    <div data-reveal className="mt-6"><Empty icon="hourglass_disabled" title={t('album.expired')} hint={t('album.expired_hint')} /></div>
                ) : (
                    <>
                        <p data-reveal className="mt-1 text-ink/70"><Icon n="hourglass_top" /> {t('album.until', { date: fmtDay(expiresAt, locale) })}</p>
                        {photos.length === 0 ? (
                            <p className="mt-6 text-ink/70">{t('album.soon')}</p>
                        ) : (
                            <div className="mt-6 columns-2 gap-3 sm:columns-3">
                                {photos.map((p, i) => (
                                    <figure data-reveal key={p.id} className="relative mb-3 break-inside-avoid">
                                        <img src={p.src} alt={t('photo.alt', { n: i + 1 })} loading="lazy" className="w-full rounded-2xl" />
                                        <a href={p.download} download aria-label={`${t('album.download')} ${i + 1}`}
                                            className="absolute bottom-2 right-2 grid size-11 place-items-center rounded-full bg-ink/80 text-white"><Icon n="download" /></a>
                                    </figure>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </Reveal>
        </PublicLayout>
    );
}
