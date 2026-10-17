<?php

namespace App\Http\Controllers;

use App\Actions\AdmitGuest;
use App\Models\Event;
use App\Models\Rsvp;
use App\Models\ScannerLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/** Organizer side of the door: check-in dashboard + door-staff links. */
class ScannerLinkController extends Controller
{
    public function checkin(Event $event, AdmitGuest $admit): Response
    {
        Gate::authorize('view', $event);

        return Inertia::render('Events/Checkin', [
            'event' => $event->only(['id', 'title', 'status']) + ['starts_at' => $event->starts_at->toIso8601String()],
            'counts' => $admit->counts($event),
            'attendees' => $event->rsvps()->confirmed()->with('guest')->orderBy('number')->get()->map(fn ($r) => [
                'id' => $r->id, 'name' => $r->name, 'number' => $r->number, 'companions' => $r->companions,
                'table' => $r->guest?->table, 'scanned_at' => $r->scanned_at?->toIso8601String(),
            ]),
            'links' => $event->scannerLinks()->whereNull('revoked_at')->latest()->get()->map(fn ($l) => [
                'id' => $l->id, 'label' => $l->label, 'url' => url('/scan/'.$l->token),
                'last_used_at' => $l->last_used_at?->toIso8601String(),
            ]),
            'canEdit' => Gate::allows('update', $event),
        ]);
    }

    public function store(Request $request, Event $event): RedirectResponse
    {
        Gate::authorize('update', $event);
        $label = $request->validate(['label' => ['required', 'string', 'max:60']])['label'];
        ScannerLink::issue($event, $label);

        return back();
    }

    public function destroy(Event $event, ScannerLink $link): RedirectResponse
    {
        Gate::authorize('update', $event);
        abort_unless($link->event_id === $event->id, 404);
        $link->forceFill(['revoked_at' => now()])->save();

        return back();
    }

    /** Manual admit / undo by the organizer (e.g. a phone without camera, or a mistaken scan). */
    public function toggle(Event $event, Rsvp $rsvp): RedirectResponse
    {
        Gate::authorize('update', $event);
        abort_unless($rsvp->event_id === $event->id && $rsvp->isConfirmed(), 404);
        $rsvp->update(['scanned_at' => $rsvp->scanned_at ? null : now(), 'scanned_by' => null]);

        return back();
    }
}
