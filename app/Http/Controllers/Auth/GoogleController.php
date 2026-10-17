<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;

class GoogleController extends Controller
{
    public function redirect(): SymfonyRedirect
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $google = Socialite::driver('google')->user();
        } catch (\Throwable) {
            return redirect()->route('login')->withErrors(['email' => 'La connexion avec Google a échoué.']);
        }

        // Match by Google id first, then link an existing account with the same e-mail.
        $user = User::where('google_id', $google->getId())->first()
            ?? User::where('email', $google->getEmail())->first();

        if ($user) {
            $user->forceFill(['google_id' => $google->getId(), 'avatar' => $user->avatar ?? $google->getAvatar()])->save();
        } else {
            // forceFill: google_id is deliberately not mass-assignable.
            $user = (new User)->forceFill([
                'name' => $google->getName() ?? $google->getEmail(),
                'email' => $google->getEmail(),
                'google_id' => $google->getId(),
                'avatar' => $google->getAvatar(),
            ]);
            $user->save();
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified(); // Google already verified it
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
