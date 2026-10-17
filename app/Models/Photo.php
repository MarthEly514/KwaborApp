<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Photo extends Model
{
    protected $guarded = [];

    protected static function booted(): void
    {
        static::deleting(fn (Photo $p) => Storage::delete($p->path));
    }
}
