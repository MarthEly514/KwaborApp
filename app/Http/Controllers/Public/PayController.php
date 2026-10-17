<?php

namespace App\Http\Controllers\Public;

use App\Actions\ConfirmPayment;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\PaymentGateway;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayController extends Controller
{
    public function checkout(Order $order): Response|RedirectResponse
    {
        $order->load('event', 'rsvp');
        if ($order->status !== 'pending') {
            return redirect('/i/'.$order->rsvp->inviteToken());
        }

        return Inertia::render('Pay/Checkout', [
            'order' => $order->only(['ref', 'method', 'amount_xof']),
            'event' => $order->event->only(['title', 'theme']),
            'name' => $order->rsvp->name,
            'people' => $order->rsvp->people(),
            'unit' => $order->event->price_xof,
            'holdMinutes' => config('kwabor.payment_hold_minutes'),
            'back' => url('/i/'.$order->rsvp->inviteToken()),
        ]);
    }

    public function start(Request $request, Order $order, PaymentGateway $gateway)
    {
        abort_unless($order->status === 'pending', 404);
        $order->update($request->validate(['method' => ['required', 'in:momo,card']]));

        return Inertia::location($gateway->checkoutUrl($order));
    }

    /** Simulated provider page. Only exists while the fake driver is configured. */
    public function fake(Order $order): Response
    {
        abort_unless(config('kwabor.payment_driver') === 'fake' && $order->status === 'pending', 404);

        return Inertia::render('Pay/Fake', ['order' => $order->only(['ref', 'method', 'amount_xof'])]);
    }

    public function fakeResult(Request $request, Order $order, ConfirmPayment $confirm): RedirectResponse
    {
        abort_unless(config('kwabor.payment_driver') === 'fake', 404);
        $ok = $request->validate(['result' => ['required', 'in:success,failure']])['result'] === 'success';
        $confirm->handle($order, $ok, 'fake-'.$order->ref);

        return redirect('/i/'.$order->rsvp->inviteToken());
    }
}
