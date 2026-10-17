<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Rsvp;
use App\Models\ScannerLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScannerTest extends TestCase
{
    use RefreshDatabase;

    private function confirmed(Event $event, string $name, int $companions = 0, array $over = []): Rsvp
    {
        $guest = $event->guests()->create(['name' => $name, 'table' => 'T4']);

        return Rsvp::create(array_merge([
            'event_id' => $event->id, 'guest_id' => $guest->id, 'name' => $name, 'answer' => 'yes', 'companions' => $companions,
            'payment_status' => 'free', 'ticket_code' => 'CODE-'.$name, 'number' => $guest->id,
        ], $over));
    }

    private function scan(string $token, string $code)
    {
        return $this->postJson("/scan/{$token}/scan", ['code' => $code]);
    }

    public function test_first_scan_admits_and_shows_name_and_companions_second_is_refused(): void
    {
        $event = Event::factory()->create();
        $this->confirmed($event, 'Awa', 2);
        $this->confirmed($event, 'Kofi');
        $link = ScannerLink::issue($event, 'Porte A');

        $first = $this->scan($link->token, 'CODE-Awa')->assertOk()->json();
        $this->assertSame('ok', $first['status']);
        $this->assertSame('Awa', $first['name']);
        $this->assertSame(2, $first['companions']);
        $this->assertSame(3, $first['people']);
        $this->assertSame('T4', $first['table']);
        $this->assertSame(3, $first['arrived']);
        $this->assertSame(4, $first['expected']);

        $second = $this->scan($link->token, 'CODE-Awa')->json();
        $this->assertSame('used', $second['status']);
        $this->assertSame(3, $second['arrived']); // count did not move
        $this->assertSame('Awa', $second['name']);
    }

    public function test_unknown_foreign_and_unconfirmed_codes_are_invalid(): void
    {
        $event = Event::factory()->create();
        $other = Event::factory()->create();
        $this->confirmed($other, 'Intruder');
        $this->confirmed($event, 'Pending', 0, ['payment_status' => 'pending']);
        $this->confirmed($event, 'Declined', 0, ['answer' => 'no']);
        $link = ScannerLink::issue($event, 'Door');

        foreach (['nope', 'CODE-Intruder', 'CODE-Pending', 'CODE-Declined'] as $code) {
            $this->assertSame('invalid', $this->scan($link->token, $code)->json('status'), $code);
        }
    }

    public function test_revoked_link_stops_working(): void
    {
        $event = Event::factory()->create();
        $link = ScannerLink::issue($event, 'Door');
        $token = $link->token;
        $link->forceFill(['revoked_at' => now()])->save();

        $this->get("/scan/{$token}")->assertNotFound();
        $this->scan($token, 'x')->assertNotFound();
    }

    public function test_scanner_is_closed_when_event_is_not_live(): void
    {
        $event = Event::factory()->create(['status' => 'ended']);
        $this->confirmed($event, 'Awa');
        $link = ScannerLink::issue($event, 'Door');

        $this->scan($link->token, 'CODE-Awa')->assertStatus(409)->assertJson(['status' => 'closed']);
    }

    public function test_search_returns_only_what_the_door_needs_and_admit_by_id(): void
    {
        $event = Event::factory()->create();
        $r = $this->confirmed($event, 'Awa', 1);
        $link = ScannerLink::issue($event, 'Door');

        $rows = $this->getJson("/scan/{$link->token}/search?q=aw")->json();
        $this->assertSame(['id', 'name', 'number', 'companions', 'table', 'scanned'], array_keys($rows[0]));
        $this->assertCount(1, $this->getJson("/scan/{$link->token}/search?q={$r->number}")->json());

        $this->postJson("/scan/{$link->token}/admit", ['rsvp_id' => $r->id])->assertJson(['status' => 'ok', 'people' => 2]);
        $this->postJson("/scan/{$link->token}/admit", ['rsvp_id' => $r->id])->assertJson(['status' => 'used']);
    }

    public function test_link_is_scoped_to_its_event(): void
    {
        $a = Event::factory()->create();
        $b = Event::factory()->create();
        $rb = $this->confirmed($b, 'Zed');
        $link = ScannerLink::issue($a, 'Door A');

        $this->postJson("/scan/{$link->token}/admit", ['rsvp_id' => $rb->id])->assertJson(['status' => 'invalid']);
        $this->assertNull($rb->fresh()->scanned_at);
    }

    public function test_token_is_stored_hashed_and_recoverable_by_organizer(): void
    {
        $event = Event::factory()->create();
        $link = ScannerLink::issue($event, 'Door');

        $this->assertDatabaseMissing('scanner_links', ['token' => $link->token]); // encrypted at rest
        $this->actingAs($event->user)->get("/events/{$event->id}/checkin")
            ->assertInertia(fn ($p) => $p->where('links.0.url', url('/scan/'.$link->token)));
    }

    public function test_organizer_can_undo_a_scan(): void
    {
        $event = Event::factory()->create();
        $r = $this->confirmed($event, 'Awa', 0, ['scanned_at' => now()]);

        $this->actingAs($event->user)->post("/events/{$event->id}/rsvps/{$r->id}/toggle-scan");
        $this->assertNull($r->fresh()->scanned_at);
        $this->actingAs($event->user)->post("/events/{$event->id}/rsvps/{$r->id}/toggle-scan");
        $this->assertNotNull($r->fresh()->scanned_at);
    }
}
