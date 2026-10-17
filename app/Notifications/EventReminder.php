<?php

namespace App\Notifications;

use App\Models\Rsvp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class EventReminder extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Rsvp $rsvp) {}

    public function via(object $notifiable): array { return ['mail']; }

    public function toMail(object $notifiable): MailMessage
    {
        $e = $this->rsvp->event;
        App::setLocale($e->locale);

        return (new MailMessage)
            ->subject(__('mail.reminder.subject', ['title' => $e->title]))
            ->greeting(__('mail.hello', ['name' => $this->rsvp->name]))
            ->line(__('mail.reminder.line', ['title' => $e->title]))
            ->line($e->starts_at->locale($e->locale)->isoFormat('LLLL').' — '.$e->location)
            ->action(__('mail.reminder.action'), url('/i/'.$this->rsvp->inviteToken()));
    }
}
