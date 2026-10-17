<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Rsvp;
use App\Notifications\AlbumReady;
use App\Notifications\DeadlineSummary;
use App\Notifications\EventReminder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AlbumAndJobsTest extends TestCase
{
    use RefreshDatabase;

    /** A real 1x1 PNG: the sandbox PHP has no GD, so UploadedFile::fake()->image() is unavailable. */
    private function png(string $name = 'a.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='));
    }

    public function test_organizer_uploads_and_guests_view_and_download(): void
    {
        Storage::fake();
        $event = Event::factory()->create();

        $this->actingAs($event->user)->post("/events/{$event->id}/photos", [
            'photos' => [$this->png('a.png'), $this->png('b.png')],
        ])->assertSessionHasNoErrors();
        $this->assertSame(2, $event->photos()->count());
        Storage::assertExists($event->photos->first()->path);

        $page = $this->get("/g/{$event->album_token}")->assertInertia(fn ($p) => $p->where('expired', false)->has('photos', 2));
        $photo = $event->photos->first();
        $this->get("/g/{$event->album_token}/photos/{$photo->id}")->assertOk();
        $this->get("/g/{$event->album_token}/photos/{$photo->id}?download=1")->assertOk()->assertHeader('content-disposition');
    }

    public function test_guests_cannot_upload_and_non_images_are_refused(): void
    {
        Storage::fake();
        $event = Event::factory()->create();

        $this->post("/events/{$event->id}/photos", ['photos' => [$this->png('a.png')]])->assertRedirect('/login');
        $this->actingAs($event->user)->post("/events/{$event->id}/photos", ['photos' => [UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')]])
            ->assertSessionHasErrors('photos.0');
    }

    public function test_photos_can_still_be_uploaded_after_the_event_ended(): void
    {
        Storage::fake();
        $event = Event::factory()->create(['status' => 'ended']);
        $this->actingAs($event->user)->post("/events/{$event->id}/photos", ['photos' => [$this->png('a.png')]]);
        $this->assertSame(1, $event->photos()->count());
    }

    public function test_album_hides_photos_after_retention_and_purge_deletes_files(): void
    {
        Storage::fake();
        $event = Event::factory()->create(['starts_at' => now()->subDays(40), 'status' => 'ended', 'photo_retention_days' => 30]);
        $this->actingAs($event->user)->post("/events/{$event->id}/photos", ['photos' => [$this->png('a.png')]]);
        $photo = $event->photos()->first();

        $this->get("/g/{$event->album_token}")->assertInertia(fn ($p) => $p->where('expired', true)->where('photos', []));
        $this->get("/g/{$event->album_token}/photos/{$photo->id}")->assertNotFound();

        $this->artisan('photos:purge')->assertSuccessful();
        $this->assertSame(0, $event->photos()->count());
        Storage::assertMissing($photo->path);
    }

    public function test_album_of_a_draft_event_is_not_public_and_photo_ids_are_scoped(): void
    {
        Storage::fake();
        $draft = Event::factory()->draft()->create();
        $this->get("/g/{$draft->album_token}")->assertNotFound();

        $a = Event::factory()->create();
        $b = Event::factory()->create();
        $this->actingAs($b->user)->post("/events/{$b->id}/photos", ['photos' => [$this->png('a.png')]]);
        $this->get("/g/{$a->album_token}/photos/{$b->photos()->first()->id}")->assertNotFound();
    }

    public function test_album_link_is_emailed_only_to_confirmed_guests_with_an_email(): void
    {
        Notification::fake();
        $event = Event::factory()->create();
        $mk = fn ($n, $contact, $extra = []) => Rsvp::create(array_merge(['event_id' => $event->id, 'client_id' => $n, 'name' => $n, 'answer' => 'yes', 'payment_status' => 'free', 'contact' => $contact], $extra));
        $mk('a', 'a@example.test'); $mk('b', '+22997000000'); $mk('c', 'c@example.test', ['answer' => 'no']); $mk('d', 'd@example.test', ['payment_status' => 'pending']);

        $this->actingAs($event->user)->post("/events/{$event->id}/album/send");
        Notification::assertSentOnDemandTimes(AlbumReady::class, 1);
    }

    public function test_events_auto_end_after_the_grace_period(): void
    {
        $old = Event::factory()->create(['starts_at' => now()->subHours(25)]);
        $recent = Event::factory()->create(['starts_at' => now()->subHours(2)]);

        $this->artisan('events:close-finished')->assertSuccessful();
        $this->assertSame('ended', $old->fresh()->status);
        $this->assertSame('published', $recent->fresh()->status);
    }

    public function test_totals_are_frozen_and_sent_when_the_deadline_passes(): void
    {
        Notification::fake();
        $event = Event::factory()->create(['rsvp_deadline_at' => now()->subMinute()]);
        $g = $event->guests()->create(['name' => 'Awa']);
        $event->guests()->create(['name' => 'Silent']);
        Rsvp::create(['event_id' => $event->id, 'guest_id' => $g->id, 'name' => 'Awa', 'answer' => 'yes', 'companions' => 2, 'payment_status' => 'free', 'ticket_code' => 't', 'number' => 1]);
        $open = Event::factory()->create(['rsvp_deadline_at' => now()->addDay()]);

        $this->artisan('events:freeze-summaries')->assertSuccessful();
        $event->refresh();
        $this->assertSame(['yes' => 1, 'no' => 0, 'pending' => 1, 'people' => 3], collect($event->summary)->only(['yes', 'no', 'pending', 'people'])->all());
        $this->assertNull($open->fresh()->summary);
        Notification::assertSentTo($event->user, DeadlineSummary::class);

        $this->artisan('events:freeze-summaries'); // runs once only
        Notification::assertSentToTimes($event->user, DeadlineSummary::class, 1);
    }

    public function test_reminders_go_out_once_within_24h_by_email_only(): void
    {
        Notification::fake();
        $soon = Event::factory()->create(['starts_at' => now()->addHours(10)]);
        $later = Event::factory()->create(['starts_at' => now()->addDays(5)]);
        $mk = fn ($e, $n, $c) => Rsvp::create(['event_id' => $e->id, 'client_id' => $n, 'name' => $n, 'answer' => 'yes', 'payment_status' => 'free', 'contact' => $c]);
        $mk($soon, 'a', 'a@example.test'); $mk($soon, 'b', '+22997000000'); $mk($later, 'c', 'c@example.test');

        $this->artisan('reminders:send')->assertSuccessful();
        $this->artisan('reminders:send')->assertSuccessful();
        Notification::assertSentOnDemandTimes(EventReminder::class, 1);
    }
}
