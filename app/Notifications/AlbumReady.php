<?php

namespace App\Notifications;

use App\Models\Rsvp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class AlbumReady extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Rsvp $rsvp) {}

    public function via(object $notifiable): array { return ['mail']; }

    public function toMail(object $notifiable): MailMessage
    {
        $e = $this->rsvp->event;
        App::setLocale($e->locale);

        return (new MailMessage)
            ->subject(__('mail.album.subject', ['title' => $e->title]))
            ->greeting(__('mail.hello', ['name' => $this->rsvp->name]))
            ->line(__('mail.album.line', ['title' => $e->title, 'date' => $e->albumExpiresAt()->locale($e->locale)->isoFormat('LL')]))
            ->action(__('mail.album.action'), url('/g/'.$e->album_token));
    }
}
