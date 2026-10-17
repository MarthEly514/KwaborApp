<?php

namespace App\Services;

use App\Models\Order;

/** Seam for the real provider (FedaPay, ...). Chosen once the money-flow decision is made. */
interface PaymentGateway
{
    /** URL the guest is sent to in order to pay. */
    public function checkoutUrl(Order $order): string;
}
