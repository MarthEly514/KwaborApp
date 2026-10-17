// Predefined palettes only — no free color picker, on purpose. Keep ids in sync with config/kwabor.php.
export interface Theme {
    id: string;
    name: string;
    bg: string;
    fg: string;
    accent: string;
    soft: string;
}

export const THEMES: Theme[] = [
    { id: 'soleil', name: 'Soleil', bg: '#EA6113', fg: '#FFF8EC', accent: '#FBB931', soft: '#FFE3B3' },
    { id: 'miel', name: 'Miel', bg: '#FBB931', fg: '#2B1708', accent: '#EA6113', soft: '#FFE3B3' },
    { id: 'braise', name: 'Braise', bg: '#2B1708', fg: '#FFE3B3', accent: '#F88F22', soft: '#4A2A10' },
    { id: 'foret', name: 'Forêt', bg: '#1F4D3A', fg: '#F4F0DC', accent: '#FBB931', soft: '#2F6B52' },
    { id: 'nuit', name: 'Nuit', bg: '#1E2A5A', fg: '#F2EEFF', accent: '#FBB931', soft: '#33427F' },
    { id: 'rose', name: 'Rose', bg: '#C2185B', fg: '#FFF1F6', accent: '#FFE3B3', soft: '#D9487D' },
];

export const themeOf = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
