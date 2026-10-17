<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Guest extends Model
{
    protected $fillable = ['name', 'phone', 'email', 'table'];

    protected static function booted(): void
    {
        static::creating(fn (Guest $g) => $g->token ??= Str::random(32));
    }

    public function event(): BelongsTo { return $this->belongsTo(Event::class); }
    public function rsvp(): HasOne { return $this->hasOne(Rsvp::class); }
}
