<?php

namespace App\Http\Controllers\Public;

use App\Actions\SubmitRsvp;
use App\Exceptions\RsvpException;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Guest;
use App\Models\RegistryItem;
use App\Models\Rsvp;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class InviteController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        [$event, $guest] = $this->resolve($token);
        abort_if($event->isDraft(), 404);
        $this->useEventLocale($request, $event);

        $rsvp = Rsvp::where('event_id', $event->id)
            ->when($guest, fn ($q) => $q->where('guest_id', $guest->id), fn ($q) => $q->where('client_id', $this->clientId($request)))
            ->first();

        return $this->page($event, $guest, $rsvp, $token, preview: false);
    }

    /** Organizer sees the card exactly as guests will, with answering disabled. */
    public function preview(Event $event): Response
    {
        Gate::authorize('view', $event);
        App::setLocale($event->locale);

        return $this->page($event, null, null, $event->open_token, preview: true);
    }

    public function rsvp(Request $request, string $token, SubmitRsvp $submit): RedirectResponse
    {
        [$event, $guest] = $this->resolve($token);
        $data = $request->validate([
            'answer' => ['required', 'in:yes,no'],
            'name' => [$guest ? 'nullable' : 'required_if:answer,yes', 'string', 'max:80'],
            'companions' => ['nullable', 'integer', 'min:0', 'max:5'],
            'note' => ['nullable', 'string', 'max:300'],
            'contact' => ['nullable', 'string', 'max:100'],
            'method' => ['nullable', 'in:momo,card'],
        ]);

        try {
            $result = $submit->handle($event, $guest, $guest ? null : $this->clientId($request), $data);
        } catch (RsvpException $e) {
            return back()->withErrors(['rsvp' => $e->reason]);
        }

        return $result['order'] ? redirect()->route('pay.checkout', $result['order']) : back();
    }

    public function claim(Request $request, string $token, RegistryItem $item): RedirectResponse
    {
        [$event, $guest] = $this->resolve($token);
        abort_unless($item->event_id === $event->id && $event->isPublished(), 404);

        $key = $guest ? "guest:{$guest->id}" : 'client:'.$this->clientId($request);
        $mine = $item->claimed_by_key === $key;
        if ($item->claimed_by_key && ! $mine) {
            return back()->withErrors(['gift' => 'taken']);
        }

        if ($mine) {
            $item->forceFill(['claimed_by_name' => null, 'claimed_by_key' => null])->save();
        } else {
            $name = $guest?->name ?? $request->validate(['name' => ['required', 'string', 'max:80']])['name'];
            $item->forceFill(['claimed_by_name' => $name, 'claimed_by_key' => $key])->save();
        }

        return back();
    }

    /** @return array{0: Event, 1: ?Guest} */
    private function resolve(string $token): array
    {
        $guest = Guest::with('event')->where('token', $token)->first();
        $event = $guest?->event ?? Event::where('open_token', $token)->first();
        abort_unless($event, 404);

        return [$event, $guest];
    }

    private function clientId(Request $request): string
    {
        return $request->session()->get('client_id') ?? tap(Str::random(24), fn ($id) => $request->session()->put('client_id', $id));
    }

    /** Guests who never picked a language see the event's own language. */
    private function useEventLocale(Request $request, Event $event): void
    {
        if (! $request->session()->has('locale')) {
            App::setLocale($event->locale);
        }
    }

    private function page(Event $event, ?Guest $guest, ?Rsvp $rsvp, string $token, bool $preview): Response
    {
        $holds = $rsvp && $rsvp->answer === 'yes'
            && ($rsvp->isConfirmed() || ($rsvp->payment_status === 'pending' && $rsvp->hold_expires_at?->isFuture()));
        $myKey = $guest ? "guest:{$guest->id}" : 'client:'.(session('client_id') ?? '');
        $state = match (true) {
            $event->isEnded() => 'ended',
            $event->deadlinePassed() => 'closed',
            $event->isFull() && ! $rsvp?->isConfirmed() => 'full',
            default => 'open',
        };

        return Inertia::render('Invite/Show', [
            'event' => $event->only(['id', 'title', 'host', 'location', 'description', 'theme', 'price_xof', 'max_companions', 'question', 'capacity'])
                + ['starts_at' => $event->starts_at->toIso8601String(), 'rsvp_deadline_at' => $event->rsvp_deadline_at?->toIso8601String()],
            'state' => $state,
            // Seats the guest could still take = free seats + the ones they already hold (so they can edit their own answer).
            'spotsLeft' => $event->spotsLeft() === null ? null : $event->spotsLeft() + ($holds ? $rsvp->people() : 0),
            'payUrl' => $rsvp && $rsvp->payment_status === 'pending' && $holds
                ? ($rsvp->orders()->where('status', 'pending')->latest('id')->first()?->ref ? route('pay.checkout', $rsvp->orders()->where('status', 'pending')->latest('id')->first()) : null)
                : null,
            'guestName' => $guest?->name,
            'token' => $token,
            'preview' => $preview,
            'rsvp' => $rsvp ? [
                'answer' => $rsvp->answer, 'name' => $rsvp->name, 'companions' => $rsvp->companions,
                'number' => $rsvp->number, 'payment_status' => $rsvp->payment_status,
                'ticket_code' => $rsvp->isConfirmed() ? $rsvp->ticket_code : null,
                'scanned_at' => $rsvp->scanned_at?->toIso8601String(),
            ] : null,
            'gifts' => $event->registryItems()->get()->map(fn ($i) => [
                'id' => $i->id, 'label' => $i->label, 'url' => $i->url,
                'claimed' => (bool) $i->claimed_by_key, 'mine' => $i->claimed_by_key === $myKey,
            ]),
            'albumUrl' => ! $preview && $event->photos()->exists() && ! $event->albumExpired() ? url('/g/'.$event->album_token) : null,
        ]);
    }
}
