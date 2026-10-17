# Kwabor — Dev Log

Chronological record of what was done on the project. Newest entries at the bottom.
Dates for the first entry come from file timestamps; the rest from the working sessions.

## 2026-10-09 — Project init (React prototype, since removed)
- Wrote `Kwabor Description.txt`: digital invitation app (events → shareable links → custom invitation page with yes/no RSVP).
  Required features on top of invitz.app: agenda reminder, numbered "J'y serai" badge, predefined color palettes only,
  per-guest personalized links, WhatsApp/e-mail reminder, QR ticket for paid events, Mobile Money + card payment,
  post-event photo album (7–30 days retention), Google Maps location.
- Planned stack: React + TypeScript, Tailwind, Material icons, GSAP, Lenis.
- Brand palette: `#EA6113`, `#FBB931`, `#F88F22`, `#FFE3B3`.
- Scaffolded a Vite + React + TS app (`app/`) with localStorage persistence covering the base brief:
  landing, dashboard, event form with live card preview, event detail, invite page, gallery.

## 2026-10-13 — Competitive research + feature pass
- Added `list.md`: 10 reference platforms (Greenvelope, Paperless Post, Evite, Punchbowl, Partiful, Canva, RSVPify, Joy, Zola, Minted).
- Researched invitz.app (templates, per-guest QR, door check-in "43 of 186", companions +N, live response dashboard, seating, memories)
  and vendor pages of the listed platforms (web results were thin for Partiful/Joy/Zola).
- Implemented in the React prototype: companions (+N), custom RSVP question, live overview + progress, QR pass for every confirmed guest,
  door check-in page, table per guest, guest phone + bulk import, WhatsApp reminder to non-responders, SMS/e-mail sharing,
  CSV export, countdown chip on the card.
- Deliberately skipped (YAGNI): bilingual AR/EN, audio/video export, camera QR scanning.

## 2026-10-13/14 — Backend for the prototype (Hono + SQLite), registry, deadline, capacity
- Added a Node backend (Hono + `node:sqlite`): events, RSVPs, photos, check-in; organizer = secret token per event (no accounts).
- Guest list kept private; invite links became `/i/<eventId>?g=<Name>`.
- New features: gift registry (guests reserve items), RSVP deadline (server-enforced), capacity limit counting companions (server-enforced).
- Verified with curl: capacity overflow → 409, closed deadline → 403, admin without token → 403, claim/check-in/photos OK.
- Known gaps: payments simulated (server trusted client's `paid`), WhatsApp reminders are `wa.me` links only.

## 2026-10-14 — Decision: rebuild on Laravel
**Why Laravel** (discussed before choosing):
- Kwabor is a server-heavy CRUD product: users, auth, payments, uploads, background jobs, mail/WhatsApp notifications.
  Laravel ships these built in (auth/Sanctum/Fortify, validation, policies, Eloquent, queues, scheduler, notifications, filesystem/S3).
- The prototype's hand-rolled backend (token auth, validation, photo storage, purge) is exactly what Laravel provides, hardened.
- Scheduler fits the photo-retention purge and event reminders; queues fit WhatsApp/e-mail sending and payment webhooks.
- Payment providers (Mobile Money aggregators like FedaPay / CinetPay, Stripe for cards) have Laravel packages or simple HTTP SDKs.
- Cheap, common PHP hosting; large hiring pool.
**Trade-offs accepted**: PHP runtime to host; React front stays possible via Inertia but is an extra layer vs. Blade/Livewire.

**Done**
- Removed the old project folder (`app/`: React front + Hono server + SQLite file). `Kwabor Description.txt` and `list.md` kept.
- Initialised Laravel 12 (`composer create-project laravel/laravel`, PHP 8.2) at the repo root.
- Config: `APP_NAME=Kwabor`, locale `fr`, SQLite database, default migrations applied (users, cache, jobs).
- Replaced the default welcome page with a minimal Kwabor landing (brand colors, Vite + Tailwind 4).
- `npm install` + `npm run build` OK; `php artisan test` → 2 passed.

**Not decided yet** (to settle before building features)
- Front-end: Inertia + React/TS (keeps the original stack) vs Blade + Livewire.
- Auth model: organizer accounts (recommended; prototype used per-event tokens) and guest access (signed links).
- Payment provider(s) and WhatsApp channel (Business API vs `wa.me` links).
- Production DB (MySQL/Postgres) and photo storage (local vs S3-compatible).

## Next
1. Pick front-end approach + auth.
2. Port data model: events, guests, rsvps, registry items, photos, payments.
3. Re-implement features from the prototype (see 2026-10-13 and 2026-10-13/14 entries) on Laravel.

## 2026-10-14 — Front-end + auth decisions applied
**Decisions (from the user):** Inertia + React/TS front end; e-mail/password auth plus Google sign-in.

**Done**
- Installed Laravel Breeze (`php artisan breeze:install react --typescript`): Inertia 2, React 18, TS, Tailwind 3, full auth screens
  (register, login, forgot/reset password, e-mail verification, profile) with their tests.
- Fixed Breeze's `package.json` which blocked `npm install`: removed the unused `@tailwindcss/vite` (Tailwind 4 plugin from the
  skeleton, Breeze uses Tailwind 3 via PostCSS) and bumped `@types/node` to ^22 (vite 7 peer requirement).
- Google auth via `laravel/socialite`:
  - migration: `users.google_id` (unique, nullable), `users.avatar`, `users.password` made nullable (Google-only accounts);
  - `Auth\GoogleController` (`/auth/google`, `/auth/google/callback`): matches by `google_id`, else links an existing account with the same
    e-mail (no duplicates), else creates one; marks e-mail verified; logs in with "remember";
  - `google_id` is intentionally not mass-assignable (a test caught it being silently dropped by `create()`; fixed with `forceFill`);
  - "Continuer avec Google" button on Login/Register (`Components/GoogleButton.tsx`, plain `<a>` since OAuth leaves the origin);
  - `config/services.php` + `.env.example` keys: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- `User` now implements `MustVerifyEmail`.
- Replaced Laravel-branded welcome with a minimal Kwabor landing (Inertia `Welcome.tsx`); removed the unused Blade welcome.
- Tests: 28 passed (Breeze auth suite + 3 Google tests with a mocked Socialite driver). `npm run build` OK.

**To enable Google login for real** (needs the owner's Google account): create an OAuth client (type Web) in Google Cloud Console,
authorized redirect URI `<APP_URL>/auth/google/callback`, then fill `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.

**Open**
- Payments provider(s), WhatsApp channel, production DB + photo storage (see previous entry).
- Breeze ships Tailwind 3; migrate to Tailwind 4 later only if there's a reason.
- GSAP / Lenis / Material Symbols from the original stack not yet re-added (add when porting the UI).

## Next
1. Port the data model: events, guests, rsvps, registry items, photos, payments (migrations + models + policies).
2. Port organizer screens (dashboard, event form with preview, event detail, check-in) as Inertia pages.
3. Public invite page + gallery via signed/guest routes.

## 2026-10-14 — Fix: confirmation e-mails never arrived (Mailpit for local dev)
- Cause: `MAIL_MAILER=log` (Laravel default) writes mails to `storage/logs/laravel.log`; nothing is delivered. Not a code bug.
- Fix: run Mailpit locally and point Laravel at it.
  - Container: `docker run -d --name mailpit --restart unless-stopped -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit`
  - `.env` / `.env.example`: `MAIL_MAILER=smtp`, `MAIL_HOST=127.0.0.1`, `MAIL_PORT=1025`, `MAIL_FROM_ADDRESS="no-reply@kwabor.test"`.
  - Inbox UI: http://localhost:8025 (SMTP on 1025). Messages are lost when the container is recreated; that's fine for dev.
- Verified: sent a verification notification, Mailpit received "Verify Email Address" from no-reply@kwabor.test. Tests: 28 passed.
- Production later: real provider (Resend/Brevo/Mailgun), verified sending domain (SPF/DKIM), and queue the verification mail.

## 2026-10-15 — Design phase: architecture, providers, user flows (no code)
- Wrote `docs/ARCHITECTURE.md` (draft for discussion): modular monolith on Laravel 12 + Inertia/React, data model, key technical
  decisions (guest tokens, transactional capacity, webhook-driven payments, signed QR, direct-to-storage photos, reminder rows + scheduler),
  provider proposal (VPS+Forge/Ploi, Cloudflare, managed DB, Redis, R2, Resend/Brevo, WhatsApp Cloud API, FedaPay/CinetPay, Sentry),
  roles, per-screen user flows with redirects, system messages, and 10 open decisions.
- Agreed process: discuss → then build → then testing.

## 2026-10-16 — Design decisions answered
- Deferred: money flow and business model (payments built behind an interface with a fake driver until decided).
- Benin first (XOF), `wa.me` only, FR+EN, VPS + Forge/Ploi, organizer-only photo upload (guests view/download),
  draft/published/ended lifecycle with ended = read-only.
- Capacity: nullable; "Complet" when a limit is set, otherwise RSVPs close at the deadline and the organizer gets a final total.
- Third user type: door staff via revocable scanner link; a scan disables the QR and increments attendance.
- Recorded in `docs/ARCHITECTURE.md` section 8 (including proposed build order). Still no app code written for these.

- 2026-10-16: confirmed one QR per RSVP; companions are managed/confirmed by the guest; scanner screen shows guest name + companion count (attendance += 1 + companions).

## 2026-10-17 — Build from the three user-flow diagrams (`reference_assets/`)
Flows implemented: organizer (landing → login/register [+Google, e-mail verify] → dashboard → events list → create / `{id}` → preview, check-in;
account → plans, payouts), guest (`/i/{token}` → RSVP → yes-form → free? confirmation/ticket : checkout → provider → ticket; `/g/{album}`),
door staff (scanner link → scanning UI).

**Backend** (Laravel 12): migrations (events, guests, rsvps, orders, registry_items, photos, scanner_links), models, `EventPolicy`
(ended = read-only; photos still manageable), actions `SubmitRsvp` / `ConfirmPayment` / `AdmitGuest`, controllers (organizer, public invite,
pay, album, scan), `PaymentGateway` + `FakeGateway`, notifications (confirmation, reminder, album, deadline summary), 4 scheduled commands
(`events:close-finished`, `events:freeze-summaries`, `reminders:send`, `photos:purge`), timezone Africa/Porto-Novo, `config/kwabor.php`.
Rules enforced server-side: draft/published/ended lifecycle, RSVP deadline, capacity in people (companions included, row-locked transaction),
15-min seat hold while paying, per-person pricing, idempotent payment confirmation, one-QR-per-RSVP scan-once with atomic UPDATE,
scanner link scoped to its event + revocable, guest tokens unguessable, gifts claimable only by the same guest.

**Front end** (Inertia + React/TS, Tailwind 3, GSAP, Lenis, Material Symbols): brand palette, FR/EN (`lang/{fr,en}.json` generated by
`scripts/build-lang.py`; Laravel `lang/{fr,en}/mail.php` + validation), mobile-first (bottom nav, 44 px targets, reduced-motion respected),
invitation card with 6 predefined palettes, event form with live preview, event page (stats, share, tabs Guests/Responses/Gifts/Photos),
live check-in page (polling), invite page (all states: open/closed/full/ended, companions, question, QR pass, .ics, maps, gifts, album),
checkout + fake provider page, scanner UI (camera via jsQR, manual search, big OK / already-scanned / invalid result with name + companions).

**Bugs found by tests while building** (fixed): `status`/`revoked_at` not mass-assignable so publish/end/revoke silently did nothing;
"no" answer on an open link failed on missing name; editing an RSVP blanked the name.

**Verification**: `php artisan test` → 78 passed (RSVP rules, payments, capacity/deadline, scanner, album + jobs, organizer authorization,
i18n key parity). `tsc` clean, `vite build` OK. HTTP smoke test of public pages against seeded data OK.
**Not verified**: no visual/browser run (Chrome extension unavailable in this session), camera QR decoding, real Google login, real e-mail
delivery from the UI, any real payment provider.

Dev: `php artisan migrate:fresh --seed` → demo@kwabor.test / password; `composer dev` (or `php artisan serve` + `queue:work`) ; Mailpit :8025.

## 2026-10-17 — UI restyle rolled back (at the user's request)
- A restyle after `reference_assets/target_UI.png` (dark icon sidebar, pastel tiles, yellow brand) was built, then reverted: the UI is back to the
  orange-brand version (Bricolage Grotesque / DM Sans, top bar + bottom tabs, original palettes). No git history existed, so files were restored by hand;
  the production bundle hash matches the pre-restyle build, and 78 tests pass.
- `reference_assets/target_UI.png` is kept for a later attempt.
