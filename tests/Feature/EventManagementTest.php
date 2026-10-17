<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Order;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventManagementTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $over = []): array
    {
        return array_merge([
            'title' => 'Anniversaire de Kofi', 'host' => 'Kofi', 'starts_at' => now()->addDays(20)->format('Y-m-d\TH:i'),
            'location' => 'Cotonou', 'description' => '', 'theme' => 'soleil', 'locale' => 'fr', 'price_xof' => 0,
            'max_companions' => 1, 'question' => '', 'rsvp_deadline_at' => null, 'capacity' => null, 'photo_retention_days' => 14,
            'registry' => [['label' => 'Mixeur', 'url' => 'https://example.com/mixeur']],
        ], $over);
    }

    public function test_organizer_creates_a_draft_with_gifts(): void
    {
        $user = User::factory()->create();
        $res = $this->actingAs($user)->post('/events', $this->payload());

        $event = Event::first();
        $res->assertRedirect(route('events.show', $event));
        $this->assertSame('draft', $event->status);
        $this->assertSame($user->id, $event->user_id);
        $this->assertSame(1, $event->registryItems()->count());
        $this->assertNotEmpty($event->open_token);
    }

    public function test_validation_rejects_unknown_theme_and_late_deadline(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/events', $this->payload(['theme' => '#ff00ff', 'rsvp_deadline_at' => now()->addDays(30)->format('Y-m-d\TH:i')]))
            ->assertSessionHasErrors(['theme', 'rsvp_deadline_at']);
    }

    public function test_only_the_owner_can_see_or_change_an_event(): void
    {
        $event = Event::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($other)->get("/events/{$event->id}")->assertForbidden();
        $this->actingAs($other)->put("/events/{$event->id}", $this->payload())->assertForbidden();
        $this->actingAs($other)->delete("/events/{$event->id}")->assertForbidden();
        $this->actingAs($other)->get("/events/{$event->id}/checkin")->assertForbidden();
        $this->actingAs($other)->get("/events/{$event->id}/preview")->assertForbidden();
    }

    public function test_visitors_are_sent_to_login(): void
    {
        $event = Event::factory()->create();
        $this->get("/events/{$event->id}")->assertRedirect('/login');
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_listing_only_shows_own_events(): void
    {
        $user = User::factory()->create();
        Event::factory()->for($user)->create(['title' => 'Mine']);
        Event::factory()->create(['title' => 'Theirs']);

        $this->actingAs($user)->get('/events')->assertInertia(fn ($p) => $p->has('events', 1)->where('events.0.title', 'Mine'));
    }

    public function test_capacity_cannot_drop_below_people_already_registered(): void
    {
        $event = Event::factory()->create(['capacity' => 10]);
        Rsvp::create(['event_id' => $event->id, 'client_id' => 'x', 'name' => 'A', 'answer' => 'yes', 'companions' => 3, 'payment_status' => 'free', 'ticket_code' => 'T', 'number' => 1]);

        $this->actingAs($event->user)->put("/events/{$event->id}", $this->payload(['capacity' => 3]))->assertSessionHasErrors('capacity');
        $this->actingAs($event->user)->put("/events/{$event->id}", $this->payload(['capacity' => 4]))->assertSessionHasNoErrors();
    }

    public function test_price_is_frozen_once_someone_paid(): void
    {
        $event = Event::factory()->paid(5000)->create();
        $rsvp = Rsvp::create(['event_id' => $event->id, 'client_id' => 'x', 'name' => 'A', 'answer' => 'yes', 'payment_status' => 'paid']);
        Order::create(['event_id' => $event->id, 'rsvp_id' => $rsvp->id, 'provider' => 'fake', 'amount_xof' => 5000, 'status' => 'paid']);

        $this->actingAs($event->user)->put("/events/{$event->id}", $this->payload(['price_xof' => 100]));
        $this->assertSame(5000, $event->fresh()->price_xof);
        $this->actingAs($event->user)->delete("/events/{$event->id}")->assertForbidden(); // paid orders block deletion
    }

    public function test_publish_then_end_makes_the_event_read_only(): void
    {
        $event = Event::factory()->draft()->create();
        $me = $event->user;

        $this->actingAs($me)->post("/events/{$event->id}/publish");
        $this->assertSame('published', $event->fresh()->status);

        $this->actingAs($me)->post("/events/{$event->id}/end");
        $this->assertSame('ended', $event->fresh()->status);

        $this->actingAs($me)->put("/events/{$event->id}", $this->payload())->assertForbidden();
        $this->actingAs($me)->post("/events/{$event->id}/guests", ['name' => 'Late'])->assertForbidden();
        $this->actingAs($me)->post("/events/{$event->id}/scanner-links", ['label' => 'Door'])->assertForbidden();
        $this->actingAs($me)->get("/events/{$event->id}")->assertOk(); // stats stay readable
    }

    public function test_guest_import_skips_duplicates_and_splits_contacts(): void
    {
        $event = Event::factory()->create();
        $text = "Awa Diallo, +229 97 00 00 00\nKofi;kofi@example.test\nAwa Diallo, +229 11\n\n   \n";
        $this->actingAs($event->user)->post("/events/{$event->id}/guests/import", ['text' => $text]);

        $this->assertSame(2, $event->guests()->count());
        $this->assertSame('+229 97 00 00 00', $event->guests()->where('name', 'Awa Diallo')->first()->phone);
        $this->assertSame('kofi@example.test', $event->guests()->where('name', 'Kofi')->first()->email);
        $this->assertNotSame($event->guests[0]->token, $event->guests[1]->token);
    }

    public function test_preview_works_on_a_draft_for_the_owner(): void
    {
        $event = Event::factory()->draft()->create();
        $this->actingAs($event->user)->get("/events/{$event->id}/preview")
            ->assertInertia(fn ($p) => $p->component('Invite/Show')->where('preview', true));
    }

    public function test_registry_edit_keeps_claims_and_removes_dropped_items(): void
    {
        $event = Event::factory()->create();
        $keep = $event->registryItems()->create(['label' => 'Mixeur']);
        $keep->forceFill(['claimed_by_name' => 'Awa', 'claimed_by_key' => 'guest:1'])->save();
        $event->registryItems()->create(['label' => 'Drop me']);

        $this->actingAs($event->user)->put("/events/{$event->id}", $this->payload([
            'starts_at' => $event->starts_at->format('Y-m-d\TH:i'),
            'registry' => [['id' => $keep->id, 'label' => 'Mixeur XL']],
        ]));

        $this->assertSame(1, $event->registryItems()->count());
        $this->assertSame('Awa', $keep->fresh()->claimed_by_name);
        $this->assertSame('Mixeur XL', $keep->fresh()->label);
    }
}
