<?php

namespace App\Actions;

use App\Exceptions\RsvpException;
use App\Models\Event;
use App\Models\Guest;
use App\Models\Order;
use App\Models\Rsvp;
use App\Notifications\RsvpConfirmed;
use App\Services\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class SubmitRsvp
{
    public function __construct(private PaymentGateway $gateway) {}

    /**
     * @param array{answer:string,name?:?string,companions?:int,note?:?string,contact?:?string,method?:?string} $data
     * @return array{rsvp: Rsvp, order: ?Order}
     * @throws RsvpException reasons: closed, full, admitted, paid_locked
     */
    public function handle(Event $event, ?Guest $guest, ?string $clientId, array $data): array
    {
        $result = DB::transaction(function () use ($event, $guest, $clientId, $data) {
            // Serialises concurrent answers for one event so capacity cannot be oversold.
            $event = Event::query()->lockForUpdate()->findOrFail($event->id);
            if (! $event->acceptsRsvps()) {
                throw new RsvpException('closed');
            }

            $rsvp = Rsvp::where('event_id', $event->id)
                ->when($guest, fn ($q) => $q->where('guest_id', $guest->id), fn ($q) => $q->where('client_id', $clientId))
                ->first() ?? new Rsvp(['event_id' => $event->id, 'guest_id' => $guest?->id, 'client_id' => $guest ? null : $clientId]);

            if ($rsvp->scanned_at) {
                throw new RsvpException('admitted');
            }

            $yes = $data['answer'] === 'yes';
            $companions = $yes ? max(0, min((int) ($data['companions'] ?? 0), $event->max_companions)) : 0;

            if ($rsvp->payment_status === 'paid' && (! $yes || $companions !== $rsvp->companions)) {
                throw new RsvpException('paid_locked'); // refunds/changes go through the organizer
            }
            if ($yes && $event->capacity !== null && $event->headcount($rsvp->id) + 1 + $companions > $event->capacity) {
                throw new RsvpException('full');
            }

            $rsvp->fill([
                'name' => trim($data['name'] ?? '') ?: ($guest?->name ?? $rsvp->name ?? ''),
                'answer' => $data['answer'],
                'companions' => $companions,
                'note' => $yes ? ($data['note'] ?? null) : null,
                'contact' => $data['contact'] ?? null,
            ]);

            $order = null;
            if (! $yes) {
                $rsvp->fill(['payment_status' => 'free', 'hold_expires_at' => null, 'number' => null, 'ticket_code' => null]);
            } elseif ($event->isPaid() && $rsvp->payment_status !== 'paid') {
                $rsvp->fill(['payment_status' => 'pending', 'hold_expires_at' => now()->addMinutes(config('kwabor.payment_hold_minutes'))]);
            } elseif (! $event->isPaid()) {
                $rsvp->payment_status = 'free';
            }
            $rsvp->save();

            if ($yes && $event->isPaid() && $rsvp->payment_status === 'pending') {
                $rsvp->orders()->where('status', 'pending')->update(['status' => 'failed']);
                $order = $rsvp->orders()->create([
                    'event_id' => $event->id,
                    'provider' => config('kwabor.payment_driver'),
                    'method' => $data['method'] ?? 'momo',
                    'amount_xof' => $event->price_xof * $rsvp->people(),
                ]);
            } elseif ($rsvp->isConfirmed()) {
                self::confirm($rsvp);
            }

            return ['rsvp' => $rsvp->fresh(), 'order' => $order, 'confirmed' => $rsvp->isConfirmed()];
        });

        if ($result['confirmed'] && $result['rsvp']->email()) {
            Notification::route('mail', $result['rsvp']->email())->notify(new RsvpConfirmed($result['rsvp']));
        }

        return ['rsvp' => $result['rsvp'], 'order' => $result['order']];
    }

    /** Gives a confirmed RSVP its badge number and QR code (idempotent). Call inside a transaction. */
    public static function confirm(Rsvp $rsvp): void
    {
        $rsvp->number ??= (int) Rsvp::where('event_id', $rsvp->event_id)->max('number') + 1;
        $rsvp->ticket_code ??= Str::random(40);
        $rsvp->hold_expires_at = null;
        $rsvp->save();
    }
}
