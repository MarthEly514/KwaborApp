<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Guest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class GuestController extends Controller
{
    public function store(Request $request, Event $event): RedirectResponse
    {
        Gate::authorize('update', $event);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
        ]);
        $this->add($event, $data);

        return back();
    }

    /** One guest per line: "name, phone-or-email" (comma, semicolon or tab). */
    public function import(Request $request, Event $event): RedirectResponse
    {
        Gate::authorize('update', $event);
        $text = $request->validate(['text' => ['required', 'string', 'max:20000']])['text'];

        $added = 0;
        foreach (preg_split('/\R/', $text) as $line) {
            [$name, $contact] = array_pad(preg_split('/[,;\t]/', $line, 2), 2, '');
            $name = trim($name);
            $contact = trim($contact);
            if ($name === '' || mb_strlen($name) > 80) {
                continue;
            }
            $added += $this->add($event, [
                'name' => $name,
                'email' => str_contains($contact, '@') ? $contact : null,
                'phone' => $contact !== '' && ! str_contains($contact, '@') ? $contact : null,
            ]) ? 1 : 0;
        }

        return back()->with('status', 'flash.guests_imported')->with('count', $added);
    }

    public function update(Request $request, Event $event, Guest $guest): RedirectResponse
    {
        Gate::authorize('update', $event);
        abort_unless($guest->event_id === $event->id, 404);
        $guest->update($request->validate(['table' => ['nullable', 'string', 'max:20']]));

        return back();
    }

    public function destroy(Event $event, Guest $guest): RedirectResponse
    {
        Gate::authorize('update', $event);
        abort_unless($guest->event_id === $event->id, 404);
        $guest->delete();

        return back();
    }

    private function add(Event $event, array $data): bool
    {
        if ($event->guests()->where('name', $data['name'])->exists()) {
            return false;
        }
        $event->guests()->create(array_filter($data, fn ($v) => $v !== null && $v !== ''));

        return true;
    }
}
