<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EventRequest extends FormRequest
{
    public function authorize(): bool { return true; } // ownership is checked by the policy in the controller

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'host' => ['required', 'string', 'max:80'],
            'starts_at' => ['required', 'date'],
            'location' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'theme' => ['required', Rule::in(config('kwabor.themes'))],
            'locale' => ['required', Rule::in(config('kwabor.locales'))],
            'price_xof' => ['required', 'integer', 'min:0', 'max:10000000'],
            'max_companions' => ['required', 'integer', 'min:0', 'max:5'],
            'question' => ['nullable', 'string', 'max:120'],
            'rsvp_deadline_at' => ['nullable', 'date', 'before_or_equal:starts_at'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'photo_retention_days' => ['required', 'integer', 'min:7', 'max:30'],
            'registry' => ['array', 'max:50'],
            'registry.*.id' => ['nullable', 'integer'],
            'registry.*.label' => ['required', 'string', 'max:120'],
            'registry.*.url' => ['nullable', 'url', 'max:300'],
        ];
    }
}
