<?php

// Partial French translation of the rules we use; anything missing falls back to English.
return [
    'required' => 'Ce champ est obligatoire.',
    'required_without' => 'Ce champ est obligatoire.',
    'string' => 'Ce champ doit être du texte.',
    'email' => 'Adresse e-mail invalide.',
    'url' => 'Lien invalide (commencez par https://).',
    'date' => 'Date invalide.',
    'integer' => 'Nombre entier attendu.',
    'in' => 'Valeur invalide.',
    'image' => 'Ce fichier doit être une image.',
    'mimes' => 'Formats acceptés : :values.',
    'before_or_equal' => 'Doit être avant ou égal à la date de l\'événement.',
    'unique' => 'Déjà utilisé.',
    'confirmed' => 'La confirmation ne correspond pas.',
    'max' => [
        'string' => 'Maximum :max caractères.',
        'numeric' => 'Maximum :max.',
        'file' => 'Fichier trop lourd (maximum :max Ko).',
        'array' => 'Maximum :max éléments.',
    ],
    'min' => [
        'string' => 'Minimum :min caractères.',
        'numeric' => 'Minimum :min.',
    ],
    'capacity_below_headcount' => 'La capacité ne peut pas être inférieure aux :n personnes déjà inscrites.',
    'too_many_photos' => 'Trop de photos pour cet événement.',
    'attributes' => [],
    'custom' => [],
];
