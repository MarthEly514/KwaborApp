<?php

return [
    'hello' => 'Hello :name,',
    'confirmed' => [
        'subject' => 'Your spot for ":title" is confirmed',
        'line' => 'You are confirmed: attendee no. :number for ":title".',
        'action' => 'View my invitation and QR code',
    ],
    'reminder' => [
        'subject' => 'Reminder: ":title" is coming up!',
        'line' => '":title" starts in less than 24 hours.',
        'action' => 'View my invitation',
    ],
    'album' => [
        'subject' => 'Photos from ":title"',
        'line' => 'Thanks for coming to ":title"! The photos are available until :date.',
        'action' => 'View and download the photos',
    ],
    'summary' => [
        'subject' => 'RSVPs closed for ":title"',
        'line' => 'The deadline has passed. Yes: :yes · No: :no · No answer: :pending · People expected: :people.',
        'action' => 'View the event',
    ],
];
