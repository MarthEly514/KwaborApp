<?php

namespace App\Services;

use App\Models\Order;

/** Dev/test provider: a local page lets you succeed or fail the payment. Never enabled in production. */
class FakeGateway implements PaymentGateway
{
    public function checkoutUrl(Order $order): string
    {
        return route('pay.fake', $order);
    }
}
