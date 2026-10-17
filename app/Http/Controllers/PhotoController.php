<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Photo;
use App\Notifications\AlbumReady;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PhotoController extends Controller
{
    private const MAX_PER_EVENT = 300;

    public function store(Request $request, Event $event): RedirectResponse
    {
        Gate::authorize('managePhotos', $event);
        $request->validate([
            'photos' => ['required', 'array', 'max:30'],
            'photos.*' => ['image', 'mimes:jpeg,png,webp', 'max:6144'],
        ]);
        abort_if($event->photos()->count() + count($request->file('photos')) > self::MAX_PER_EVENT, 422, __('validation.too_many_photos'));

        foreach ($request->file('photos') as $file) {
            $event->photos()->create([
                'path' => $file->store("photos/{$event->id}"),
                'original_name' => $file->getClientOriginalName(),
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        }

        return back();
    }

    public function destroy(Event $event, Photo $photo): RedirectResponse
    {
        Gate::authorize('managePhotos', $event);
        abort_unless($photo->event_id === $event->id, 404);
        $photo->delete();

        return back();
    }

    /** Organizer's own view of a photo (private disk, so it is streamed). */
    public function show(Event $event, Photo $photo): StreamedResponse
    {
        Gate::authorize('managePhotos', $event);
        abort_unless($photo->event_id === $event->id, 404);

        return Storage::response($photo->path, $photo->original_name);
    }

    /** E-mails the album link to confirmed guests who left an e-mail address. */
    public function send(Event $event): RedirectResponse
    {
        Gate::authorize('managePhotos', $event);
        $rsvps = $event->rsvps()->confirmed()->with('event')->get()->filter(fn ($r) => $r->email());
        foreach ($rsvps as $r) {
            Notification::route('mail', $r->email())->notify(new AlbumReady($r));
        }

        return back()->with('status', 'flash.album_sent')->with('count', $rsvps->count());
    }
}
