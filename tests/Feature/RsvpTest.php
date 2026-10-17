<?php

namespace Tests\Feature;

use App\Actions\ConfirmPayment;
use App\Models\Event;
use App\Models\Order;
use App\Models\Rsvp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RsvpTest extends TestCase
{
    use RefreshDatabase;

    private function yes(string $token, array $extra = [])
    {
        return $this->post("/i/{$token}/rsvp", ['answer' => 'yes', 'name' => 'Awa', ...$extra]);
    }

    public function test_guest_confirms_and_gets_number_and_ticket(): void
    {
        $event = Event::factory()->create();
        $a = $event->guests()->create(['name' => 'Awa']);
        $b = $event->guests()->create(['name' => 'Kofi']);

        $this->post("/i/{$a->token}/rsvp", ['answer' => 'yes', 'companions' => 2])->assertSessionHasNoErrors();
        $this->post("/i/{$b->token}/rsvp", ['answer' => 'yes'])->assertSessionHasNoErrors();

        $ra = Rsvp::where('guest_id', $a->id)->first();
        $this->assertSame(1, $ra->number);
        $this->assertSame(2, $ra->companions);
        $this->assertNotEmpty($ra->ticket_code);
        $this->assertSame(2, Rsvp::where('guest_id', $b->id)->first()->number);
        $this->assertSame('Awa', $ra->name); // name comes from the personalized link
    }

    public function test_open_link_requires_a_name_and_identifies_by_session(): void
    {
        $event = Event::factory()->create();
        $this->post("/i/{$event->open_token}/rsvp", ['answer' => 'yes'])->assertSessionHasErrors('name');

        $this->yes($event->open_token)->assertSessionHasNoErrors();
        $this->yes($event->open_token, ['companions' => 1]); // same session edits, no duplicate
        $this->assertSame(1, Rsvp::count());
        $this->assertSame(1, Rsvp::first()->companions);
    }

    public function test_companions_are_capped_by_the_event_setting(): void
    {
        $event = Event::factory()->create(['max_companions' => 1]);
        $this->yes($event->open_token, ['companions' => 5]);
        $this->assertSame(1, Rsvp::first()->companions);
    }

    public function test_capacity_counts_companions_and_shows_full(): void
    {
        $event = Event::factory()->create(['capacity' => 3]);
        $this->yes($event->open_token, ['companions' => 2])->assertSessionHasNoErrors(); // 3 people
        $this->flushSession();
        $this->yes($event->open_token, ['name' => 'Bob'])->assertSessionHasErrors(['rsvp' => 'full']);

        $this->get("/i/{$event->open_token}")->assertInertia(fn ($p) => $p->where('state', 'full')->where('spotsLeft', 0));
    }

    public function test_changing_own_answer_does_not_double_count_seats(): void
    {
        $event = Event::factory()->create(['capacity' => 3]);
        $this->yes($event->open_token, ['companions' => 2]);
        $this->yes($event->open_token, ['companions' => 1])->assertSessionHasNoErrors();
        $this->assertSame(2, $event->headcount());
    }

    public function test_no_answer_releases_seats_and_ticket(): void
    {
        $event = Event::factory()->create(['capacity' => 2]);
        $this->yes($event->open_token);
        $this->post("/i/{$event->open_token}/rsvp", ['answer' => 'no']);
        $r = Rsvp::first();
        $this->assertSame('no', $r->answer);
        $this->assertNull($r->ticket_code);
        $this->assertSame(0, $event->headcount());
    }

    public function test_deadline_closes_answers(): void
    {
        $event = Event::factory()->create(['rsvp_deadline_at' => now()->subHour()]);
        $this->yes($event->open_token)->assertSessionHasErrors(['rsvp' => 'closed']);
        $this->get("/i/{$event->open_token}")->assertInertia(fn ($p) => $p->where('state', 'closed'));
    }

    public function test_draft_invite_is_not_public_and_ended_is_locked(): void
    {
        $draft = Event::factory()->draft()->create();
        $this->get("/i/{$draft->open_token}")->assertNotFound();

        $ended = Event::factory()->create(['status' => 'ended']);
        $this->yes($ended->open_token)->assertSessionHasErrors(['rsvp' => 'closed']);
    }

    public function test_admitted_guest_cannot_change_answer(): void
    {
        $event = Event::factory()->create();
        $this->yes($event->open_token);
        Rsvp::first()->update(['scanned_at' => now()]);
        $this->post("/i/{$event->open_token}/rsvp", ['answer' => 'no'])->assertSessionHasErrors(['rsvp' => 'admitted']);
    }

    public function test_confirmation_email_goes_to_guests_who_left_an_address(): void
    {
        Notification::fake();
        $event = Event::factory()->create();
        $this->yes($event->open_token, ['contact' => 'awa@example.test']);
        Notification::assertSentOnDemand(\App\Notifications\RsvpConfirmed::class);

        Notification::fake();
        $this->flushSession();
        $this->yes($event->open_token, ['name' => 'Kofi', 'contact' => '+229 97 00 00 00']);
        Notification::assertNothingSent(); // WhatsApp numbers are not e-mailed
    }

    // ---- paid events ------------------------------------------------------

    public function test_paid_event_creates_order_holds_seats_then_confirms_on_payment(): void
    {
        $event = Event::factory()->paid(5000)->create(['capacity' => 2]);
        $res = $this->yes($event->open_token, ['companions' => 1]);

        $order = Order::first();
        $res->assertRedirect(route('pay.checkout', $order));
        $this->assertSame(10000, $order->amount_xof); // per person
        $r = Rsvp::first();
        $this->assertSame('pending', $r->payment_status);
        $this->assertNull($r->ticket_code); // no ticket before payment
        $this->assertSame(2, $event->headcount()); // seats held

        $this->flushSession();
        $this->yes($event->open_token, ['name' => 'Bob'])->assertSessionHasErrors(['rsvp' => 'full']);

        app(ConfirmPayment::class)->handle($order, true);
        $r->refresh();
        $this->assertSame('paid', $r->payment_status);
        $this->assertNotEmpty($r->ticket_code);
        $this->assertSame(1, $r->number);
    }

    public function test_failed_payment_or_expired_hold_releases_the_seats(): void
    {
        $event = Event::factory()->paid()->create(['capacity' => 1]);
        $this->yes($event->open_token);
        $order = Order::first();

        $this->travel(config('kwabor.payment_hold_minutes') + 1)->minutes();
        $this->assertSame(0, $event->headcount()); // hold expired

        app(ConfirmPayment::class)->handle($order, false);
        $this->assertSame('failed', $order->fresh()->status);
        $this->assertNull(Rsvp::first()->ticket_code);
    }

    public function test_payment_confirmation_is_idempotent(): void
    {
        $event = Event::factory()->paid()->create();
        $this->yes($event->open_token);
        $order = Order::first();
        app(ConfirmPayment::class)->handle($order, true);
        $code = Rsvp::first()->ticket_code;
        app(ConfirmPayment::class)->handle($order, true);
        app(ConfirmPayment::class)->handle($order, false); // late contradictory webhook is ignored
        $this->assertSame($code, Rsvp::first()->ticket_code);
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function test_paid_guest_cannot_change_companions_or_cancel(): void
    {
        $event = Event::factory()->paid()->create();
        $this->yes($event->open_token, ['companions' => 1]);
        app(ConfirmPayment::class)->handle(Order::first(), true);

        $this->yes($event->open_token, ['companions' => 2])->assertSessionHasErrors(['rsvp' => 'paid_locked']);
        $this->post("/i/{$event->open_token}/rsvp", ['answer' => 'no'])->assertSessionHasErrors(['rsvp' => 'paid_locked']);
    }

    public function test_fake_gateway_page_flow(): void
    {
        $event = Event::factory()->paid()->create();
        $this->yes($event->open_token);
        $order = Order::first();

        $this->get(route('pay.checkout', $order))->assertInertia(fn ($p) => $p->component('Pay/Checkout')->where('order.amount_xof', 5000));
        $this->post(route('pay.start', $order), ['method' => 'card'])->assertRedirect(route('pay.fake', $order));
        $this->assertSame('card', $order->fresh()->method);
    }

    public function test_fake_gateway_can_be_disabled(): void
    {
        config(['kwabor.payment_driver' => 'stripe']);
        $event = Event::factory()->paid()->create();
        $this->yes($event->open_token);
        $this->get(route('pay.fake', Order::first()))->assertNotFound();
    }

    public function test_gift_claim_belongs_to_one_guest(): void
    {
        $event = Event::factory()->create();
        $item = $event->registryItems()->create(['label' => 'Mixeur']);
        $a = $event->guests()->create(['name' => 'Awa']);
        $b = $event->guests()->create(['name' => 'Kofi']);

        $this->post("/i/{$a->token}/gifts/{$item->id}");
        $this->assertSame('Awa', $item->fresh()->claimed_by_name);
        $this->post("/i/{$b->token}/gifts/{$item->id}")->assertSessionHasErrors('gift');
        $this->post("/i/{$a->token}/gifts/{$item->id}"); // same guest releases
        $this->assertNull($item->fresh()->claimed_by_key);
    }
}
