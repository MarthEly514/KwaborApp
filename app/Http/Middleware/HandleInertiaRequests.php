<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /** @return array<string, mixed> */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => ['user' => $request->user()],
            // Closures: resolved at render time, after a controller may have switched locale.
            'locale' => fn () => App::getLocale(),
            'translations' => fn () => json_decode((string) @file_get_contents(lang_path(App::getLocale().'.json')), true) ?: [],
            'flash' => fn () => ['status' => $request->session()->get('status'), 'count' => $request->session()->get('count')],
        ];
    }
}
