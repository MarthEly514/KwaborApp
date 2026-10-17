<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function view(User $user, Event $event): bool
    {
        return $event->user_id === $user->id;
    }

    /** Ended events are read-only: no edits, guests, gifts, door staff or check-in changes. */
    public function update(User $user, Event $event): bool
    {
        return $this->view($user, $event) && ! $event->isEnded();
    }

    public function delete(User $user, Event $event): bool
    {
        return $this->view($user, $event) && ! $event->orders()->where('status', 'paid')->exists();
    }

    /** Photos are uploaded after the event, so they stay manageable once it ended. */
    public function managePhotos(User $user, Event $event): bool
    {
        return $this->view($user, $event);
    }
}
