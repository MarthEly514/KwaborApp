<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $locale = $request->validate(['locale' => ['required', 'in:'.implode(',', config('kwabor.locales'))]])['locale'];
        $request->session()->put('locale', $locale);

        return back();
    }
}
