<?php

use App\Http\Controllers\EventController;
use App\Http\Controllers\GuestController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScannerLinkController;
use App\Http\Controllers\Public\AlbumController;
use App\Http\Controllers\Public\InviteController;
use App\Http\Controllers\Public\PayController;
use App\Http\Controllers\Public\ScanController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Welcome'))->name('home');
Route::post('/locale', LocaleController::class)->name('locale');

// ---- Organizer (account) ---------------------------------------------------
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', \App\Http\Controllers\DashboardController::class)->name('dashboard');

    Route::resource('events', EventController::class)->except([]);
    Route::post('events/{event}/publish', [EventController::class, 'publish'])->name('events.publish');
    Route::post('events/{event}/end', [EventController::class, 'end'])->name('events.end');
    Route::get('events/{event}/preview', [InviteController::class, 'preview'])->name('events.preview');

    Route::post('events/{event}/guests', [GuestController::class, 'store'])->name('guests.store');
    Route::post('events/{event}/guests/import', [GuestController::class, 'import'])->name('guests.import');
    Route::patch('events/{event}/guests/{guest}', [GuestController::class, 'update'])->name('guests.update');
    Route::delete('events/{event}/guests/{guest}', [GuestController::class, 'destroy'])->name('guests.destroy');

    Route::post('events/{event}/photos', [PhotoController::class, 'store'])->name('events.photos.store');
    Route::get('events/{event}/photos/{photo}', [PhotoController::class, 'show'])->name('events.photos.show');
    Route::delete('events/{event}/photos/{photo}', [PhotoController::class, 'destroy'])->name('events.photos.destroy');
    Route::post('events/{event}/album/send', [PhotoController::class, 'send'])->name('events.album.send');

    Route::get('events/{event}/checkin', [ScannerLinkController::class, 'checkin'])->name('events.checkin');
    Route::post('events/{event}/scanner-links', [ScannerLinkController::class, 'store'])->name('scanner-links.store');
    Route::delete('events/{event}/scanner-links/{link}', [ScannerLinkController::class, 'destroy'])->name('scanner-links.destroy');
    Route::post('events/{event}/rsvps/{rsvp}/toggle-scan', [ScannerLinkController::class, 'toggle'])->name('rsvps.toggle-scan');

    Route::prefix('account')->name('account.')->group(function () {
        Route::get('/', fn () => Inertia::render('Account/Index'))->name('index');
        Route::get('plans', fn () => Inertia::render('Account/Plans'))->name('plans');
        Route::get('payouts', fn () => Inertia::render('Account/Payouts'))->name('payouts');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ---- Guest (no account) ----------------------------------------------------
Route::get('/i/{token}', [InviteController::class, 'show'])->name('invite.show');
Route::post('/i/{token}/rsvp', [InviteController::class, 'rsvp'])->middleware('throttle:30,1')->name('invite.rsvp');
Route::post('/i/{token}/gifts/{item}', [InviteController::class, 'claim'])->middleware('throttle:30,1')->name('invite.claim');

Route::get('/pay/{order}', [PayController::class, 'checkout'])->name('pay.checkout');
Route::post('/pay/{order}', [PayController::class, 'start'])->name('pay.start');
Route::get('/pay/{order}/fake', [PayController::class, 'fake'])->name('pay.fake');
Route::post('/pay/{order}/fake', [PayController::class, 'fakeResult'])->name('pay.fake.result');

Route::get('/g/{token}', [AlbumController::class, 'show'])->name('album.show');
Route::get('/g/{token}/photos/{photo}', [AlbumController::class, 'photo'])->name('album.photo');

// ---- Door staff (scanner link) ---------------------------------------------
Route::get('/scan/{token}', [ScanController::class, 'show'])->name('scan.show');
Route::middleware('throttle:120,1')->group(function () {
    Route::post('/scan/{token}/scan', [ScanController::class, 'scan'])->name('scan.scan');
    Route::post('/scan/{token}/admit', [ScanController::class, 'admit'])->name('scan.admit');
    Route::get('/scan/{token}/search', [ScanController::class, 'search'])->name('scan.search');
});

require __DIR__.'/auth.php';
