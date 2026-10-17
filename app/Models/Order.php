<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Order extends Model
{
    protected $guarded = [];

    protected function casts(): array { return ['paid_at' => 'datetime']; }

    protected static function booted(): void
    {
        static::creating(fn (Order $o) => $o->ref ??= (string) Str::uuid());
    }

    public function getRouteKeyName(): string { return 'ref'; }
    public function rsvp(): BelongsTo { return $this->belongsTo(Rsvp::class); }
    public function event(): BelongsTo { return $this->belongsTo(Event::class); }
}
