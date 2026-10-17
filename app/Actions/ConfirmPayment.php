<?php

namespace App\Actions;

use App\Models\Order;
use App\Notifications\RsvpConfirmed;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ConfirmPayment
{
    /**
     * Called by the payment provider's verified webhook (or the fake gateway in dev). Idempotent.
     * If the hold expired meanwhile the payment still wins: money was taken, so the seat is honoured.
     */
    public function handle(Order $order, bool $success, ?string $providerRef = null): Order
    {
        $rsvp = DB::transaction(function () use ($order, $success, $providerRef) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($order->status !== 'pending') {
                return null;
            }
            $rsvp = $order->rsvp;

            if ($success) {
                $order->update(['status' => 'paid', 'paid_at' => now(), 'provider_ref' => $providerRef]);
                $rsvp->payment_status = 'paid';
                SubmitRsvp::confirm($rsvp);

                return $rsvp;
            }
            $order->update(['status' => 'failed', 'provider_ref' => $providerRef]);
            $rsvp->update(['hold_expires_at' => null]); // seat released, guest may retry

            return null;
        });

        if ($rsvp?->email()) {
            Notification::route('mail', $rsvp->email())->notify(new RsvpConfirmed($rsvp));
        }

        return $order->fresh();
    }
}
