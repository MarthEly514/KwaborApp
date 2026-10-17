<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title');
            $t->string('host');
            $t->dateTime('starts_at');
            $t->string('location');
            $t->text('description')->nullable();
            $t->string('theme')->default('soleil');
            $t->string('locale', 2)->default('fr');
            $t->string('status')->default('draft'); // draft | published | ended
            $t->unsignedInteger('price_xof')->default(0); // per person, 0 = free
            $t->unsignedTinyInteger('max_companions')->default(0);
            $t->string('question')->nullable();
            $t->dateTime('rsvp_deadline_at')->nullable();
            $t->unsignedInteger('capacity')->nullable(); // people incl. companions, null = unlimited
            $t->unsignedTinyInteger('photo_retention_days')->default(30);
            $t->string('open_token')->unique();
            $t->string('album_token')->unique();
            $t->json('summary')->nullable(); // totals frozen at the RSVP deadline
            $t->timestamps();
            $t->index(['user_id', 'starts_at']);
        });

        Schema::create('guests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('event_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('phone')->nullable();
            $t->string('email')->nullable();
            $t->string('table')->nullable();
            $t->string('token')->unique();
            $t->timestamps();
            $t->unique(['event_id', 'name']);
        });

        Schema::create('scanner_links', function (Blueprint $t) {
            $t->id();
            $t->foreignId('event_id')->constrained()->cascadeOnDelete();
            $t->string('label');
            $t->string('token_hash')->unique();
            $t->text('token'); // encrypted, so the organizer can copy the link again
            $t->timestamp('revoked_at')->nullable();
            $t->timestamp('last_used_at')->nullable();
            $t->timestamps();
        });

        Schema::create('rsvps', function (Blueprint $t) {
            $t->id();
            $t->foreignId('event_id')->constrained()->cascadeOnDelete();
            $t->foreignId('guest_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('client_id')->nullable(); // open-link guests: random id kept in their session
            $t->string('name');
            $t->string('answer'); // yes | no
            $t->unsignedTinyInteger('companions')->default(0);
            $t->string('note')->nullable();
            $t->string('contact')->nullable(); // whatsapp number or e-mail, optional
            $t->unsignedInteger('number')->nullable(); // "J'y serai" badge
            $t->string('payment_status')->default('free'); // free | pending | paid
            $t->timestamp('hold_expires_at')->nullable();
            $t->string('ticket_code')->nullable()->unique(); // QR content
            $t->timestamp('scanned_at')->nullable();
            $t->foreignId('scanned_by')->nullable()->constrained('scanner_links')->nullOnDelete();
            $t->timestamp('reminded_at')->nullable();
            $t->timestamps();
            $t->unique(['event_id', 'guest_id']);
            $t->unique(['event_id', 'client_id']);
            $t->index(['event_id', 'answer']);
        });

        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->uuid('ref')->unique();
            $t->foreignId('event_id')->constrained()->cascadeOnDelete();
            $t->foreignId('rsvp_id')->constrained()->cascadeOnDelete();
            $t->string('provider');
            $t->string('method')->default('momo'); // momo | card
            $t->unsignedInteger('amount_xof');
            $t->string('status')->default('pending'); // pending | paid | failed
            $t->string('provider_ref')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
        });

        Schema::create('registry_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('event_id')->constrained()->cascadeOnDelete();
            $t->string('label');
            $t->string('url')->nullable();
            $t->string('claimed_by_name')->nullable();
            $t->string('claimed_by_key')->nullable(); // guest:{id} | client:{id}
            $t->timestamps();
        });

        Schema::create('photos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('event_id')->constrained()->cascadeOnDelete();
            $t->string('path');
            $t->string('original_name');
            $t->string('mime');
            $t->unsignedInteger('size');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['photos', 'registry_items', 'orders', 'rsvps', 'scanner_links', 'guests', 'events'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
