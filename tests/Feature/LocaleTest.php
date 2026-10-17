<?php

namespace Tests\Feature;

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_fr_and_en_dictionaries_have_the_same_keys_and_placeholders(): void
    {
        $fr = json_decode(file_get_contents(lang_path('fr.json')), true);
        $en = json_decode(file_get_contents(lang_path('en.json')), true);

        $this->assertSame([], array_diff_key($fr, $en), 'missing in en');
        $this->assertSame([], array_diff_key($en, $fr), 'missing in fr');
        foreach ($fr as $key => $text) {
            preg_match_all('/:[a-z]+/', $text, $a);
            preg_match_all('/:[a-z]+/', $en[$key], $b);
            $this->assertEqualsCanonicalizing($a[0], $b[0], "placeholders differ for {$key}");
            $this->assertNotSame('', trim($text), $key);
        }
    }

    public function test_every_translation_key_used_by_the_ui_exists(): void
    {
        $fr = json_decode(file_get_contents(lang_path('fr.json')), true);
        $used = [];
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(resource_path('js'))) as $f) {
            if (preg_match('/\.tsx?$/', $f)) {
                preg_match_all("/\\bt\\(\\s*'([a-z_]+(?:\\.[a-z_0-9]+)+)'/", file_get_contents($f), $m);
                $used = array_merge($used, $m[1]);
            }
        }
        $this->assertNotEmpty($used);
        $this->assertSame([], array_values(array_diff(array_unique($used), array_keys($fr))));
    }

    public function test_default_is_french_and_visitor_can_switch_to_english(): void
    {
        $this->get('/')->assertInertia(fn ($p) => $p->where('locale', 'fr')->where('translations', fn ($t) => $t['nav.logout'] === 'Déconnexion'));
        $this->post('/locale', ['locale' => 'en'])->assertRedirect();
        $this->get('/')->assertInertia(fn ($p) => $p->where('locale', 'en')->where('translations', fn ($t) => $t['nav.logout'] === 'Log out'));
        $this->post('/locale', ['locale' => 'de'])->assertSessionHasErrors('locale');
    }

    public function test_guest_sees_the_events_language_until_they_choose_their_own(): void
    {
        $event = Event::factory()->create(['locale' => 'en']);
        $this->get("/i/{$event->open_token}")->assertInertia(fn ($p) => $p->where('locale', 'en'));

        $this->post('/locale', ['locale' => 'fr']);
        $this->get("/i/{$event->open_token}")->assertInertia(fn ($p) => $p->where('locale', 'fr'));
    }

    public function test_emails_use_the_events_language(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        $event = Event::factory()->create(['locale' => 'en', 'title' => 'Party']);
        $rsvp = \App\Models\Rsvp::create(['event_id' => $event->id, 'client_id' => 'x', 'name' => 'Awa', 'answer' => 'yes', 'payment_status' => 'free', 'number' => 7, 'contact' => 'a@b.test']);

        $mail = (new \App\Notifications\RsvpConfirmed($rsvp))->toMail(new \stdClass);
        $this->assertSame('Your spot for "Party" is confirmed', $mail->subject);
    }
}
