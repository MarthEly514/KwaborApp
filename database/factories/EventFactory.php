<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class EventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'host' => fake()->name(),
            'starts_at' => now()->addDays(10),
            'location' => 'Salle Les Palmiers, Cotonou',
            'description' => null,
            'theme' => 'soleil',
            'locale' => 'fr',
            'status' => 'published',
            'price_xof' => 0,
            'max_companions' => 2,
            'photo_retention_days' => 30,
            'open_token' => Str::random(24),
            'album_token' => Str::random(24),
        ];
    }

    public function draft(): static { return $this->state(['status' => 'draft']); }
    public function paid(int $price = 5000): static { return $this->state(['price_xof' => $price]); }
}
