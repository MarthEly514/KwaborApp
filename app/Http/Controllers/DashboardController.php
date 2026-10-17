<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $events = $request->user()->events()->get();
        $upcoming = $events->where('status', '!=', 'ended')->where('starts_at', '>=', now()->subDay())->sortBy('starts_at')->take(3);

        return Inertia::render('Dashboard', [
            'totals' => [
                'events' => $events->count(),
                'published' => $events->where('status', 'published')->count(),
                'people' => $events->sum(fn (Event $e) => $e->stats()['people']),
            ],
            'upcoming' => $upcoming->values()->map(fn (Event $e) => [
                'id' => $e->id, 'title' => $e->title, 'starts_at' => $e->starts_at->toIso8601String(),
                'theme' => $e->theme, 'status' => $e->status, 'location' => $e->location, 'stats' => $e->stats(),
            ]),
        ]);
    }
}
