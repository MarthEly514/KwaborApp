<?php

namespace App\Console\Commands;

use App\Models\Rsvp;
use App\Notifications\EventReminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class SendReminders extends Command
{
    protected $signature = 'reminders:send';
    protected $description = 'E-mail a reminder to confirmed guests whose event starts within 24 hours';

    public function handle(): int
    {
        $sent = 0;
        Rsvp::confirmed()->whereNull('reminded_at')->whereNull('scanned_at')
            ->whereHas('event', fn ($q) => $q->where('status', 'published')->whereBetween('starts_at', [now(), now()->addDay()]))
            ->with('event')->each(function (Rsvp $r) use (&$sent) {
                if ($email = $r->email()) {
                    Notification::route('mail', $email)->notify(new EventReminder($r));
                    $sent++;
                }
                $r->update(['reminded_at' => now()]); // also for guests without e-mail, so we do not rescan them hourly
            });
        $this->info("Sent {$sent} reminder(s).");

        return self::SUCCESS;
    }
}
