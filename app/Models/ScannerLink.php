<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ScannerLink extends Model
{
    protected $fillable = ['label'];

    protected function casts(): array
    {
        return ['token' => 'encrypted', 'revoked_at' => 'datetime', 'last_used_at' => 'datetime'];
    }

    public static function issue(Event $event, string $label): self
    {
        $token = Str::random(40);
        $link = new self(['label' => $label]);
        $link->event_id = $event->id;
        $link->token = $token;
        $link->token_hash = hash('sha256', $token);
        $link->save();

        return $link;
    }

    public static function findByToken(string $token): ?self
    {
        return self::where('token_hash', hash('sha256', $token))->whereNull('revoked_at')->first();
    }

    public function event(): BelongsTo { return $this->belongsTo(Event::class); }
}
