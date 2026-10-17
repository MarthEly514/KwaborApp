<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Notifications\DeadlineSummary;
use Illuminate\Console\Command;

class FreezeSummaries extends Command
{
    protected $signature = 'events:freeze-summaries';
    protected $description = 'When the RSVP deadline passes, freeze the totals and send them to the organizer';

    public function handle(): int
    {
        $events = Event::where('status', 'published')->whereNull('summary')
            ->whereNotNull('rsvp_deadline_at')->where('rsvp_deadline_at', '<', now())->get();

        foreach ($events as $event) {
            $stats = $event->stats();
            $event->summary = [
                'yes' => $stats['yes'], 'no' => $stats['no'], 'pending' => $stats['pending'],
                'people' => $stats['people'], 'frozen_at' => now()->toIso8601String(),
            ];
            $event->save();
            $event->user->notify(new DeadlineSummary($event));
        }
        $this->info("Froze {$events->count()} summary(ies).");

        return self::SUCCESS;
    }
}
