<?php

namespace App\Actions;

use App\Models\Event;
use App\Models\Rsvp;
use App\Models\ScannerLink;

class AdmitGuest
{
    /**
     * Marks a ticket as used. The conditional UPDATE makes a double scan race-safe:
     * only one request can flip scanned_at from null.
     *
     * @return array<string,mixed> status: ok | used | invalid
     */
    public function handle(Event $event, ?ScannerLink $link, ?string $code = null, ?int $rsvpId = null): array
    {
        $rsvp = Rsvp::where('event_id', $event->id)
            ->when($code !== null, fn ($q) => $q->where('ticket_code', $code))
            ->when($rsvpId !== null, fn ($q) => $q->where('id', $rsvpId))
            ->first();

        if (! $rsvp || ! $rsvp->isConfirmed() || ! $rsvp->ticket_code || ($code === null && $rsvpId === null)) {
            return ['status' => 'invalid'] + $this->counts($event);
        }

        $won = Rsvp::where('id', $rsvp->id)->whereNull('scanned_at')
            ->update(['scanned_at' => now(), 'scanned_by' => $link?->id]) === 1;
        $rsvp->refresh();

        return [
            'status' => $won ? 'ok' : 'used',
            'name' => $rsvp->name,
            'companions' => $rsvp->companions,
            'people' => $rsvp->people(),
            'number' => $rsvp->number,
            'table' => $rsvp->guest?->table,
            'at' => $rsvp->scanned_at->toIso8601String(),
        ] + $this->counts($event);
    }

    /** @return array{arrived:int, expected:int} in people (guests + companions) */
    public function counts(Event $event): array
    {
        $q = fn () => $event->rsvps()->confirmed();

        return [
            'arrived' => (int) $q()->whereNotNull('scanned_at')->sum(\DB::raw('1 + companions')),
            'expected' => (int) $q()->sum(\DB::raw('1 + companions')),
        ];
    }
}
