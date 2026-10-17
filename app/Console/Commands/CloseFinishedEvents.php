<?php

namespace App\Console\Commands;

use App\Models\Event;
use Illuminate\Console\Command;

class CloseFinishedEvents extends Command
{
    protected $signature = 'events:close-finished';
    protected $description = 'End published events whose start was more than the grace period ago (they become read-only)';

    public function handle(): int
    {
        $n = Event::where('status', 'published')
            ->where('starts_at', '<', now()->subHours(config('kwabor.event_grace_hours')))
            ->update(['status' => 'ended']);
        $this->info("Ended {$n} event(s).");

        return self::SUCCESS;
    }
}
