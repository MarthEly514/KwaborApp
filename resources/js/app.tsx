import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import gsap from 'gsap';
import Lenis from 'lenis';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Kwabor';

// Smooth scroll, driven by GSAP's ticker so animations and scrolling share one clock.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const lenis = new Lenis();
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
}

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#EA6113',
    },
});
