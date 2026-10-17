<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'host', 'starts_at', 'location', 'description', 'theme', 'locale', 'price_xof',
        'max_companions', 'question', 'rsvp_deadline_at', 'capacity', 'photo_retention_days',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'rsvp_deadline_at' => 'datetime',
            'summary' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Event $e) {
            $e->open_token ??= Str::random(24);
            $e->album_token ??= Str::random(24);
        });
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function guests(): HasMany { return $this->hasMany(Guest::class); }
    public function rsvps(): HasMany { return $this->hasMany(Rsvp::class); }
    public function registryItems(): HasMany { return $this->hasMany(RegistryItem::class); }
    public function photos(): HasMany { return $this->hasMany(Photo::class); }
    public function scannerLinks(): HasMany { return $this->hasMany(ScannerLink::class); }
    public function orders(): HasMany { return $this->hasMany(Order::class); }

    public function isDraft(): bool { return $this->status === 'draft'; }
    public function isPublished(): bool { return $this->status === 'published'; }
    public function isEnded(): bool { return $this->status === 'ended'; }
    public function isPaid(): bool { return $this->price_xof > 0; }

    public function deadlinePassed(): bool
    {
        return $this->rsvp_deadline_at !== null && $this->rsvp_deadline_at->isPast();
    }

    public function acceptsRsvps(): bool
    {
        return $this->isPublished() && ! $this->deadlinePassed();
    }

    /** People (guests + companions) holding a seat: confirmed, or paying within the hold window. */
    public function headcount(?int $exceptRsvpId = null): int
    {
        return (int) $this->rsvps()->counted()
            ->when($exceptRsvpId, fn ($q) => $q->where('id', '!=', $exceptRsvpId))
            ->selectRaw('coalesce(sum(1 + companions), 0) as n')->value('n');
    }

    public function spotsLeft(): ?int
    {
        return $this->capacity === null ? null : max(0, $this->capacity - $this->headcount());
    }

    public function isFull(): bool
    {
        return $this->capacity !== null && $this->spotsLeft() === 0;
    }

    /** Photos stay available this long after the event day. */
    public function albumExpiresAt(): \Illuminate\Support\Carbon
    {
        return $this->starts_at->copy()->addDays($this->photo_retention_days);
    }

    public function albumExpired(): bool
    {
        return $this->albumExpiresAt()->isPast();
    }

    /** Numbers shown on the organizer overview. People = guests + companions. */
    public function stats(): array
    {
        $yes = $this->rsvps()->confirmed();
        $answered = $this->rsvps()->whereNotNull('guest_id')->count();

        return [
            'invited' => $this->guests()->count(),
            'yes' => (clone $yes)->count(),
            'no' => $this->rsvps()->where('answer', 'no')->count(),
            'pending' => max(0, $this->guests()->count() - $answered),
            'people' => (int) (clone $yes)->sum(\DB::raw('1 + companions')),
            'arrived' => (int) (clone $yes)->whereNotNull('scanned_at')->sum(\DB::raw('1 + companions')),
            'spots_left' => $this->spotsLeft(),
        ];
    }
}
