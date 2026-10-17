<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rsvp extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['hold_expires_at' => 'datetime', 'scanned_at' => 'datetime', 'reminded_at' => 'datetime'];
    }

    public function event(): BelongsTo { return $this->belongsTo(Event::class); }
    public function guest(): BelongsTo { return $this->belongsTo(Guest::class); }
    public function orders(): HasMany { return $this->hasMany(Order::class); }

    /** Yes answers that are fully confirmed (free, or paid). */
    public function scopeConfirmed(Builder $q): void
    {
        $q->where('answer', 'yes')->whereIn('payment_status', ['free', 'paid']);
    }

    /** Confirmed, plus those still inside their payment hold. */
    public function scopeCounted(Builder $q): void
    {
        $q->where('answer', 'yes')->where(function ($w) {
            $w->whereIn('payment_status', ['free', 'paid'])
                ->orWhere(fn ($p) => $p->where('payment_status', 'pending')->where('hold_expires_at', '>', now()));
        });
    }

    public function people(): int { return 1 + $this->companions; }
    public function isConfirmed(): bool { return $this->answer === 'yes' && in_array($this->payment_status, ['free', 'paid']); }

    public function email(): ?string
    {
        return $this->contact && str_contains($this->contact, '@') ? $this->contact : null;
    }

    /** Link the guest uses to come back to their invitation. */
    public function inviteToken(): string
    {
        return $this->guest?->token ?? $this->event->open_token;
    }
}
