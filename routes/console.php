<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('events:close-finished')->hourly();
Schedule::command('events:freeze-summaries')->everyFiveMinutes();
Schedule::command('reminders:send')->hourly();
Schedule::command('photos:purge')->daily();
