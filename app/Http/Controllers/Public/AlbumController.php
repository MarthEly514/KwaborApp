<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Photo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Guests only view and download; the organizer uploads. */
class AlbumController extends Controller
{
    public function show(string $token): Response
    {
        $event = $this->event($token);
        $expired = $event->albumExpired();

        return Inertia::render('Album/Show', [
            'title' => $event->title,
            'theme' => $event->theme,
            'expired' => $expired,
            'expiresAt' => $event->albumExpiresAt()->toIso8601String(),
            'photos' => $expired ? [] : $event->photos()->get()->map(fn ($p) => [
                'id' => $p->id,
                'src' => route('album.photo', [$token, $p]),
                'download' => route('album.photo', [$token, $p, 'download' => 1]),
            ]),
        ]);
    }

    public function photo(Request $request, string $token, Photo $photo): StreamedResponse
    {
        $event = $this->event($token);
        abort_if($photo->event_id !== $event->id || $event->albumExpired(), 404);

        return $request->boolean('download')
            ? Storage::download($photo->path, $photo->original_name)
            : Storage::response($photo->path, $photo->original_name);
    }

    private function event(string $token): Event
    {
        $event = Event::where('album_token', $token)->firstOrFail();
        abort_if($event->isDraft(), 404);

        return $event;
    }
}
