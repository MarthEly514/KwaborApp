<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\ScannerLink;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Local demo data only: `php artisan migrate:fresh --seed`. Login: demo@kwabor.test / password */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::factory()->create(['name' => 'Demo Organisateur', 'email' => 'demo@kwabor.test']);

        $event = Event::factory()->for($user)->create([
            'title' => "Anniversaire d'Awa", 'host' => 'Awa Diallo', 'starts_at' => now()->addDays(12)->setTime(18, 0),
            'location' => 'Salle Les Palmiers, Cotonou', 'description' => 'Venez nombreux, tenue festive !',
            'max_companions' => 2, 'question' => 'Allergies ou menu spécial ?', 'capacity' => 40,
            'rsvp_deadline_at' => now()->addDays(8), 'status' => 'published',
        ]);
        foreach ([['Kofi Mensah', '+229 97 00 00 01'], ['Fatou Sow', '+229 97 00 00 02'], ['Marc Adjovi', null]] as [$name, $phone]) {
            $event->guests()->create(['name' => $name, 'phone' => $phone]);
        }
        $event->registryItems()->createMany([['label' => 'Mixeur'], ['label' => 'Set de verres', 'url' => 'https://example.com/verres']]);
        ScannerLink::issue($event, 'Porte principale');

        Event::factory()->for($user)->draft()->create(['title' => 'Concert Kwabor Live', 'host' => 'Kwabor Prod', 'price_xof' => 5000, 'capacity' => 200]);
    }
}
