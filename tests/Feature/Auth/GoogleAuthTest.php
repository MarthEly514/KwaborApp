<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    private function fakeGoogle(string $id, string $email): void
    {
        $g = Mockery::mock(SocialiteUser::class);
        $g->shouldReceive('getId')->andReturn($id);
        $g->shouldReceive('getEmail')->andReturn($email);
        $g->shouldReceive('getName')->andReturn('Awa Diallo');
        $g->shouldReceive('getAvatar')->andReturn('https://example.test/a.png');
        Socialite::shouldReceive('driver->user')->andReturn($g);
    }

    public function test_redirects_to_google(): void
    {
        $this->get('/auth/google')->assertRedirectContains('accounts.google.com');
    }

    public function test_new_google_user_is_created_and_logged_in(): void
    {
        $this->fakeGoogle('g-1', 'awa@example.test');

        $this->get('/auth/google/callback')->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();
        $user = User::where('email', 'awa@example.test')->firstOrFail();
        $this->assertSame('g-1', $user->google_id);
        $this->assertNull($user->password);
        $this->assertTrue($user->hasVerifiedEmail());
    }

    public function test_existing_email_account_is_linked_not_duplicated(): void
    {
        $existing = User::factory()->create(['email' => 'awa@example.test']);
        $this->fakeGoogle('g-2', 'awa@example.test');

        $this->get('/auth/google/callback');

        $this->assertAuthenticatedAs($existing);
        $this->assertSame(1, User::count());
        $this->assertSame('g-2', $existing->fresh()->google_id);
    }
}
