<?php

namespace App\Http\Controllers\Public;

use App\Actions\AdmitGuest;
use App\Http\Controllers\Controller;
use App\Models\ScannerLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Door staff: no account, just a revocable link tied to one event. */
class ScanController extends Controller
{
    public function show(string $token, AdmitGuest $admit): Response
    {
        $link = $this->link($token);
        $event = $link->event;
        $link->forceFill(['last_used_at' => now()])->save();

        return Inertia::render('Scan/Show', [
            'token' => $token,
            'label' => $link->label,
            'event' => ['title' => $event->title, 'theme' => $event->theme],
            'open' => $this->open($link),
            'counts' => $admit->counts($event),
        ]);
    }

    public function scan(Request $request, string $token, AdmitGuest $admit): JsonResponse
    {
        $link = $this->link($token);
        $code = $request->validate(['code' => ['required', 'string', 'max:100']])['code'];
        if (! $this->open($link)) {
            return response()->json(['status' => 'closed'], 409);
        }

        return response()->json($admit->handle($link->event, $link, code: $code));
    }

    public function admit(Request $request, string $token, AdmitGuest $admit): JsonResponse
    {
        $link = $this->link($token);
        $id = $request->validate(['rsvp_id' => ['required', 'integer']])['rsvp_id'];
        if (! $this->open($link)) {
            return response()->json(['status' => 'closed'], 409);
        }

        return response()->json($admit->handle($link->event, $link, rsvpId: $id));
    }

    /** Name / badge-number lookup for guests whose QR cannot be read. Returns only what the door needs. */
    public function search(Request $request, string $token): JsonResponse
    {
        $link = $this->link($token);
        $q = trim((string) $request->query('q'));
        if ($q === '') {
            return response()->json([]);
        }

        return response()->json($link->event->rsvps()->confirmed()->with('guest')
            ->where(fn ($w) => $w->where('name', 'like', '%'.addcslashes($q, '%_').'%')->orWhere('number', is_numeric($q) ? (int) $q : -1))
            ->orderBy('name')->limit(10)->get()->map(fn ($r) => [
                'id' => $r->id, 'name' => $r->name, 'number' => $r->number, 'companions' => $r->companions,
                'table' => $r->guest?->table, 'scanned' => (bool) $r->scanned_at,
            ]));
    }

    private function link(string $token): ScannerLink
    {
        return ScannerLink::with('event')->where('token_hash', hash('sha256', $token))->whereNull('revoked_at')->firstOrFail();
    }

    private function open(ScannerLink $link): bool
    {
        return $link->event->isPublished();
    }
}
