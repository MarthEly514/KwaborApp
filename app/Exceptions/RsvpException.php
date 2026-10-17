<?php

namespace App\Exceptions;

use RuntimeException;

/** Business-rule refusal. `$reason` is a stable code the UI translates. */
class RsvpException extends RuntimeException
{
    public function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }
}
