<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\App;

class DeadlineSummary extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Event $event) {}

    public function via(object $notifiable): array { return ['mail']; }

    public function toMail(object $notifiable): MailMessage
    {
        $e = $this->event;
        $s = $e->summary;
        App::setLocale($e->locale);

        return (new MailMessage)
            ->subject(__('mail.summary.subject', ['title' => $e->title]))
            ->line(__('mail.summary.line', ['yes' => $s['yes'], 'no' => $s['no'], 'pending' => $s['pending'], 'people' => $s['people']]))
            ->action(__('mail.summary.action'), route('events.show', $e));
    }
}
