export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    email_verified_at?: string;
}

export type Locale = 'fr' | 'en';

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    locale: Locale;
    translations: Record<string, string>;
    flash: { status?: string | null; count?: number | null };
};

export type EventStatus = 'draft' | 'published' | 'ended';

export interface EventStats {
    invited: number;
    yes: number;
    no: number;
    pending: number;
    people: number;
    arrived: number;
    spots_left: number | null;
}

export interface EventCard {
    id: number;
    title: string;
    starts_at: string;
    theme: string;
    status: EventStatus;
    location: string;
    stats: EventStats;
}
