<?php

namespace App\Http\Controllers;

use App\Http\Requests\EventRequest;
use App\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function index(Request $request): Response
    {
        $events = $request->user()->events()->orderByDesc('starts_at')->get()
            ->map(fn (Event $e) => $this->card($e));

        return Inertia::render('Events/Index', ['events' => $events]);
    }

    public function create(): Response
    {
        return Inertia::render('Events/Form', ['event' => null, 'locks' => ['price' => false, 'minCapacity' => 0]]);
    }

    public function store(EventRequest $request): RedirectResponse
    {
        $event = new Event($request->safe()->except('registry'));
        $event->user_id = $request->user()->id;
        $event->status = 'draft';
        $event->save();
        $this->syncRegistry($event, $request->validated('registry', []));

        return redirect()->route('events.show', $event)->with('status', 'flash.event_created');
    }

    public function show(Event $event): Response
    {
        Gate::authorize('view', $event);
        $event->load(['guests.rsvp', 'registryItems', 'photos', 'scannerLinks']);
        $rsvps = $event->rsvps()->with('guest')->latest()->get();

        return Inertia::render('Events/Show', [
            'event' => $this->detail($event),
            'stats' => $event->stats(),
            'openUrl' => url('/i/'.$event->open_token),
            'albumUrl' => url('/g/'.$event->album_token),
            'guests' => $event->guests->map(fn ($g) => [
                'id' => $g->id, 'name' => $g->name, 'phone' => $g->phone, 'email' => $g->email, 'table' => $g->table,
                'url' => url('/i/'.$g->token),
                'answer' => $g->rsvp?->answer, 'companions' => $g->rsvp?->companions,
            ]),
            'rsvps' => $rsvps->map(fn ($r) => [
                'id' => $r->id, 'name' => $r->name, 'answer' => $r->answer, 'number' => $r->number,
                'companions' => $r->companions, 'note' => $r->note, 'contact' => $r->contact,
                'payment_status' => $r->payment_status, 'scanned_at' => $r->scanned_at?->toIso8601String(),
                'table' => $r->guest?->table,
            ]),
            'gifts' => $event->registryItems->map(fn ($i) => ['id' => $i->id, 'label' => $i->label, 'url' => $i->url, 'claimed_by' => $i->claimed_by_name]),
            'photos' => $event->photos->map(fn ($p) => ['id' => $p->id, 'src' => route('events.photos.show', [$event, $p])]),
            'can' => [
                'update' => Gate::allows('update', $event),
                'delete' => Gate::allows('delete', $event),
            ],
        ]);
    }

    public function edit(Event $event): Response
    {
        Gate::authorize('update', $event);

        return Inertia::render('Events/Form', [
            'event' => $this->detail($event->load('registryItems')) + ['starts_at_input' => $event->starts_at->format('Y-m-d\TH:i'),
                'deadline_input' => $event->rsvp_deadline_at?->format('Y-m-d\TH:i')],
            'locks' => [
                'price' => $event->orders()->where('status', 'paid')->exists(), // price is frozen once someone paid
                'minCapacity' => $event->headcount(),
            ],
        ]);
    }

    public function update(EventRequest $request, Event $event): RedirectResponse
    {
        Gate::authorize('update', $event);
        $data = $request->safe()->except('registry');

        if ($event->orders()->where('status', 'paid')->exists()) {
            $data['price_xof'] = $event->price_xof;
        }
        if (isset($data['capacity']) && $data['capacity'] < $event->headcount()) {
            throw ValidationException::withMessages(['capacity' => __('validation.capacity_below_headcount', ['n' => $event->headcount()])]);
        }

        $event->update($data);
        $this->syncRegistry($event, $request->validated('registry', []));

        return redirect()->route('events.show', $event)->with('status', 'flash.event_saved');
    }

    public function publish(Event $event): RedirectResponse
    {
        Gate::authorize('update', $event);
        $event->forceFill(['status' => 'published'])->save();

        return back()->with('status', 'flash.event_published');
    }

    public function end(Event $event): RedirectResponse
    {
        Gate::authorize('update', $event);
        $event->forceFill(['status' => 'ended'])->save();

        return back()->with('status', 'flash.event_ended');
    }

    public function destroy(Event $event): RedirectResponse
    {
        Gate::authorize('delete', $event);
        Storage::deleteDirectory("photos/{$event->id}");
        $event->delete();

        return redirect()->route('events.index')->with('status', 'flash.event_deleted');
    }

    private function card(Event $e): array
    {
        return ['id' => $e->id, 'title' => $e->title, 'starts_at' => $e->starts_at->toIso8601String(), 'theme' => $e->theme,
            'status' => $e->status, 'location' => $e->location, 'stats' => $e->stats()];
    }

    private function detail(Event $e): array
    {
        return $e->only(['id', 'title', 'host', 'location', 'description', 'theme', 'locale', 'status', 'price_xof',
            'max_companions', 'question', 'capacity', 'photo_retention_days']) + [
            'starts_at' => $e->starts_at->toIso8601String(),
            'rsvp_deadline_at' => $e->rsvp_deadline_at?->toIso8601String(),
            'album_expires_at' => $e->albumExpiresAt()->toIso8601String(),
            'summary' => $e->summary,
            'registry' => $e->relationLoaded('registryItems')
                ? $e->registryItems->map(fn ($i) => ['id' => $i->id, 'label' => $i->label, 'url' => $i->url])->values() : [],
        ];
    }

    /** Keeps claims on items that still exist, removes dropped ones, adds new ones. */
    private function syncRegistry(Event $event, array $items): void
    {
        $keep = [];
        foreach ($items as $row) {
            $item = isset($row['id']) ? $event->registryItems()->find($row['id']) : null;
            $item ??= $event->registryItems()->make();
            $item->fill(['label' => $row['label'], 'url' => $row['url'] ?? null])->save();
            $keep[] = $item->id;
        }
        $event->registryItems()->whereNotIn('id', $keep)->delete();
    }
}
