<?php

return [
    // Predefined palettes only (no free color picker). Colors live in the front end.
    'themes' => ['soleil', 'miel', 'braise', 'foret', 'nuit', 'rose'],
    'locales' => ['fr', 'en'],

    // Seats held for a guest while they pay.
    'payment_hold_minutes' => 15,
    // Event is auto-ended this long after it starts (RSVPs, edits and scanning lock).
    'event_grace_hours' => 24,
    // Payment driver: "fake" simulates a provider (dev/test). Real gateway comes with the money-flow decision.
    'payment_driver' => env('PAYMENT_DRIVER', 'fake'),
];
