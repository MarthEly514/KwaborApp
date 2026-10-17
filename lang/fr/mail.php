<?php

return [
    'hello' => 'Bonjour :name,',
    'confirmed' => [
        'subject' => 'Votre place pour « :title » est confirmée',
        'line' => 'C\'est confirmé : vous êtes le participant n°:number de « :title ».',
        'action' => 'Voir mon invitation et mon QR code',
    ],
    'reminder' => [
        'subject' => 'Rappel : « :title » c\'est bientôt !',
        'line' => '« :title » a lieu dans moins de 24 heures.',
        'action' => 'Voir mon invitation',
    ],
    'album' => [
        'subject' => 'Les photos de « :title »',
        'line' => 'Merci d\'être venu(e) à « :title » ! Les photos sont disponibles jusqu\'au :date.',
        'action' => 'Voir et télécharger les photos',
    ],
    'summary' => [
        'subject' => 'Réponses closes pour « :title »',
        'line' => 'La date limite est passée. Oui : :yes · Non : :no · Sans réponse : :pending · Personnes attendues : :people.',
        'action' => 'Voir l\'événement',
    ],
];
