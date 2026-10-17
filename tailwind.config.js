import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['"DM Sans"', ...defaultTheme.fontFamily.sans],
                display: ['"Bricolage Grotesque"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: { DEFAULT: '#EA6113', dark: '#C2500B' }, // dark: AA contrast for white-on-orange text
                sun: '#FBB931',
                amber: '#F88F22',
                cream: '#FFE3B3',
                paper: '#FFF8EC',
                ink: '#2B1708',
            },
        },
    },

    plugins: [forms],
};
