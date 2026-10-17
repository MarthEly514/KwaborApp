<?php

namespace App\Console\Commands;

use App\Models\Event;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeExpiredPhotos extends Command
{
    protected $signature = 'photos:purge';
    protected $description = 'Delete photos (files + rows) once the retention window after the event is over';

    public function handle(): int
    {
        $n = 0;
        Event::whereHas('photos')->each(function (Event $event) use (&$n) {
            if ($event->albumExpired()) {
                $event->photos->each->delete(); // model hook removes the file
                Storage::deleteDirectory("photos/{$event->id}");
                $n++;
            }
        });
        $this->info("Purged {$n} album(s).");

        return self::SUCCESS;
    }
}
