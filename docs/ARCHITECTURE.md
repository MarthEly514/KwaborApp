# Kwabor — Architecture, Providers & User Flows (DRAFT for discussion)

Status: proposal, nothing below is built yet. Items marked **[DECIDE]** need an answer before building.

---

## 1. Scope (from the description + feature map)

Organizer creates an event → shares links → guests get a personalized card and answer yes/no.

| Area | Features |
|---|---|
| Core | Events, themed card (predefined palettes), personalized links, RSVP yes/no, "J'y serai" numbered badge |
| Reminders | Agenda (.ics) + WhatsApp/e-mail reminder (contact optional) |
| Guest list | Companions (+N), custom question, import, table, non-responder nudge |
| Limits | RSVP deadline, capacity (people incl. companions) |
| Money | Paid events: Mobile Money (default) + card for foreigners, QR ticket |
| Event day | QR pass for everyone, door check-in, "X of Y arrived" |
| Gifts | Registry (guests reserve an item) |
| Memories | Organizer uploads photos, album link sent to confirmed guests, retention 7–30 days |
| Location | Google Maps embed + directions |
| Accounts | E-mail/password + Google; e-mail verification |

---

## 2. Architecture

### 2.1 Style
**Modular monolith**: one Laravel 12 app serves the Inertia/React UI, the JSON-free server-rendered pages,
webhooks, queues and the scheduler. No microservices, no separate API (YAGNI) — a mobile app later can
use Sanctum on the same codebase.

```
                   ┌──────────────────────────── Cloudflare (DNS, CDN, WAF, TLS) ───────────────────────────┐
 Organizer ───┐    │                                                                                         │
 Guest ───────┼──► │   Laravel app (PHP-FPM / Octane)  ──►  MySQL/Postgres (managed)                         │
 Door staff ──┘    │   ├─ Inertia + React/TS pages        ──►  Redis (cache, sessions, queues)               │
                   │   ├─ Auth (Breeze + Socialite)       ──►  Object storage (S3-compatible)  ◄─ signed URLs │
                   │   ├─ Webhooks (payments, WhatsApp)                                                      │
                   │   └─ Policies (organizer only sees own events)                                          │
                   │                                                                                         │
                   │   Queue workers ──► Mail (SMTP/API) · WhatsApp Cloud API · SMS · Payment provider API  │
                   │   Scheduler (cron, every minute) ──► reminders · album dispatch · photo purge           │
                   └─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layers (inside the monolith)
- **HTTP**: controllers thin; Form Requests validate; Policies authorize; Inertia responses.
- **Domain actions** (`app/Actions/*`): `CreateEvent`, `SubmitRsvp`, `ClaimGift`, `CheckInGuest`, `IssueTicket`,
  `DispatchAlbum`… one class per use case, unit-testable, called by controllers/jobs.
- **Integrations behind interfaces** (`app/Services/*`): `PaymentGateway`, `MessageChannel` (mail/WhatsApp/SMS),
  `PhotoStorage` — swap providers without touching actions.
- **Jobs**: send message, process payment webhook, generate thumbnails, build album, purge photos.
- **Frontend**: Inertia pages in `resources/js/Pages`, shared UI kit (Btn, Field, card), GSAP/Lenis for motion.

### 2.3 Data model (core tables)
```
users            id, name, email, password?, google_id?, avatar, email_verified_at
events           id, user_id, slug/public_id, title, host, starts_at, location, description, theme,
                 status(draft|published|ended), price_xof, currency, max_companions, question,
                 rsvp_deadline_at, capacity, photo_retention_days, album_token, timezone
guests           id, event_id, name, phone?, email?, table?, invite_token(unique, unguessable), invited_at
rsvps            id, event_id, guest_id?, client_id?, name, answer, number, companions, note, contact,
                 checked_in_at?, UNIQUE(event_id, guest_id|client_id)
registry_items   id, event_id, label, url?, claimed_by_rsvp_id?/claimed_name
orders           id, event_id, rsvp_id, provider, provider_ref, amount, currency, status(pending|paid|failed|refunded), paid_at
tickets          id, rsvp_id, code (signed), issued_at, used_at?
photos           id, event_id, path, thumb_path, width, height, size, created_at
reminders        id, event_id, rsvp_id, channel, kind(24h|2h|album), send_at, sent_at?, status
message_logs     id, channel, to, template, status, provider_id, error
```
Indexes: `events(user_id)`, `rsvps(event_id, answer)`, `guests(invite_token)`, `reminders(status, send_at)`.

### 2.4 Key technical decisions
1. **Guest identity = unguessable `invite_token`** per guest (replaces the prototype's `?g=Name`, which anyone could spoof).
   Open link (no guest) uses a per-device `client_id` cookie.
2. **Capacity is enforced in a DB transaction** with row lock on the event (`SELECT … FOR UPDATE`) — no overbooking under concurrency.
3. **Payments are webhook-driven and idempotent**: the browser return URL never marks anything paid; only a verified webhook does.
   Seat is *held* (pending order, 15 min TTL) while paying, then released if unpaid.
4. **QR ticket = signed payload** (HMAC of rsvp id + event id); door scanner verifies server-side and rejects reuse.
5. **Photos**: uploaded direct-to-storage via pre-signed URL (keeps PHP workers free), server makes thumbnails (queue),
   EXIF stripped, private bucket + signed URLs; scheduler purges at `event end + retention`.
6. **Reminders are rows, not cron per event**: scheduler each minute picks `reminders.send_at <= now AND status = pending`.
7. **i18n**: French first (`fr`), structure ready for `en`; all dates in event timezone.
8. **Security**: rate limiting on RSVP/login, CSRF, hashed passwords, signed URLs, private storage, audit of check-ins,
   GDPR/local data-protection basics (export + delete guest data, retention limits).

### 2.5 Environments
`local` (composer dev + Mailpit + SQLite/MySQL) → `staging` (same stack, test payment keys) → `production`.
CI: GitHub Actions — pint, phpunit, tsc, build; deploy on tag/merge to main.

---

## 3. Cloud providers (proposal — verify availability/pricing for your target countries)

Target users are in West Africa (FCFA, Mobile Money) with some foreign guests. Nearest large cloud regions are in
Europe (Paris) — African regions exist (Cape Town, Lagos edge) but are farther from Benin/Togo/CI or limited. A CDN in front matters more than region.

| Concern | Recommended | Why / alternatives |
|---|---|---|
| App hosting | **Hetzner / Scaleway / OVH VPS (Paris/Frankfurt)** managed via **Laravel Forge or Ploi** | Cheap, predictable, enough for years. Alt: Laravel Cloud (zero-ops, pricier), AWS (more knobs, more cost). |
| Edge | **Cloudflare** (DNS, CDN, WAF, DDoS, TLS) | Free tier is plenty; good African PoPs |
| Database | **Managed MySQL/Postgres** from the same host (or PlanetScale/Neon later) | Backups + PITR; start with 1 small instance |
| Cache/queue | **Redis** (managed or on the VM) | Queues, sessions, rate limits |
| Object storage | **Cloudflare R2** (S3-compatible, no egress fees) | Photo albums are download-heavy; alt: Scaleway/Backblaze/S3 |
| E-mail | **Resend** or **Brevo** (EU) | Transactional, SPF/DKIM; Mailpit stays for local |
| WhatsApp | **Meta WhatsApp Cloud API** (direct, or via Twilio/360dialog) | Template messages required for reminders; fallback = `wa.me` link the organizer taps |
| SMS (optional) | Twilio or a local aggregator | Only if WhatsApp coverage is insufficient |
| Payments (Mobile Money + cards) | **FedaPay** (Benin/Togo/…) and/or **CinetPay** (CI + many countries) | Aggregate MTN/Moov/Orange… + cards. **Stripe may not be available for a business registered in your country** — check before relying on it for foreign cards; FedaPay/CinetPay card rails or PayPal are alternatives |
| Auth | Google OAuth (done) | |
| Monitoring | **Sentry** (errors) + **Better Stack/UptimeRobot** (uptime) + Laravel Pail/logs | |
| Backups | Provider snapshots + nightly DB dump to a second bucket | Test restore quarterly |

Rough cost shape at launch: one small VM + managed DB + R2 + mail + CDN = low tens of USD/month; payment and WhatsApp fees are per transaction/message.

---

## 4. Roles

| Role | Account | Can |
|---|---|---|
| **Organizer** | Yes (email/pw or Google, verified) | Everything on own events |
| **Guest** | No | Open own invite, RSVP, pay, get ticket, reserve gift, view album |
| **Door staff** (optional, **[DECIDE]**) | No — PIN/magic link per event | Check-in only (scan/search), no guest data export |

---

## 5. User flows

Legend: `→` redirect/navigate · `[button]` action · *italic* = system behaviour.

### 5.1 Public & auth

| Screen (URL) | User does | Goes to |
|---|---|---|
| **Landing** `/` | Reads value prop; [Créer un compte] / [Se connecter] / (logged in) [Mes événements] | `/register` · `/login` · `/dashboard` |
| **Register** `/register` | Fills name/email/password or [S'inscrire avec Google] | Email: → `/verify-email`. Google: → Google consent → *callback* → `/dashboard` |
| **Verify e-mail notice** `/verify-email` | Opens e-mail, clicks link (or [Renvoyer]) | Link → `/dashboard?verified=1` |
| **Login** `/login` | Email/password or [Continuer avec Google] | Intended URL or `/dashboard`; unverified → `/verify-email` |
| **Forgot / Reset password** | Enters email → clicks mailed link → new password | `/login` with status message |
| **Profile** `/profile` | Edit name/email, change password, delete account | stays; delete → `/` |

### 5.2 Organizer

| Screen | User does | Goes to |
|---|---|---|
| **Dashboard** `/dashboard` | Sees events (status, yes/no, headcount, next date). Empty state → [Créer un événement] | `/events/create` · `/events/{id}` |
| **Create event** `/events/create` (stepper, live card preview) | 1 Basics: title, host, date/time, place (Maps check), message → 2 Look: pick palette → 3 Rules: companions, question, deadline, capacity → 4 Tickets: free/paid + price → 5 Gifts (optional) → [Enregistrer en brouillon] / [Publier] | `/events/{id}` (draft or published banner) |
| **Event overview** `/events/{id}` (tabs) | Sees stats: invited / yes / no / pending / headcount / seats left, progress bar, deadline & capacity chips; shares general link (copy, WhatsApp, SMS, e-mail) | Tabs below; [Modifier] → `/events/{id}/edit`; [Supprimer] → confirm → `/dashboard` |
| ↳ **Guests** | Adds one / imports CSV-paste (name, phone/email) ; sets table; copies or sends each personalized link; [Relancer les non-répondants] | stays (sends queued messages, shows status) |
| ↳ **Responses** | Reads answers + notes; [Exporter CSV]; sends per-guest WhatsApp reminder | stays |
| ↳ **Gifts** | Sees what's reserved by whom | stays |
| ↳ **Photos** | Uploads photos (progress, thumbnails); removes; sets retention (7–30 d); [Envoyer l'album aux participants] (or auto after event) | stays; shows sent count |
| ↳ **Payments** | Sees orders, paid/pending/refunded, totals, payout status | `/account/payouts` for payout setup |
| **Edit event** `/events/{id}/edit` | Same form as create; capacity can't go below current headcount; price locked once tickets sold (warn) | `/events/{id}` |
| **Check-in** `/events/{id}/checkin` | Scans guest QR with camera or searches name/number → marks arrived; sees "X sur Y personnes arrivées"; sees table | stays; invalid/used QR → red state |
| **Payouts** `/account/payouts` **[DECIDE]** | Adds Mobile Money number / bank, KYC if required, sees balance & history | stays |

### 5.3 Guest (no account)

| Screen | User does | Goes to |
|---|---|---|
| **Invite** `/i/{token}` | Sees personalized card (name, date, countdown, place, spots left, deadline). Also sees map + gifts. | RSVP below |
| ↳ **[Non]** | *Saves answer* | Thank-you state (can change until deadline) |
| ↳ **[Oui, j'y serai]** → **Details form** | Name (if open link), companions (limited by spots), custom answer, WhatsApp/e-mail (optional, for reminder + album) | Free: *confirm* → **Confirmation**. Paid: → **Checkout** |
| **Checkout** (free event skips) | Chooses Mobile Money (default) or card; pays | Provider page/widget → *return* `/i/{token}/payment/return` → "Vérification…" → *webhook confirms* → **Ticket** |
| **Confirmation / Ticket** `/i/{token}` (state) | Sees "J'y serai #012", companions, QR pass/ticket; [Ajouter à mon agenda] (.ics with alarms); [Itinéraire]; ticket also e-mailed/WhatsApped | — |
| **Closed / Full / Expired** | Sees explanatory state; if full: **[DECIDE]** waitlist? | — |
| **Gift reserve** (on invite) | [Je l'offre] on an item → released by same guest | stays |
| **Album** `/g/{album_token}` | Browses/downloads photos until expiry | Expired → "Cet album a expiré" |

### 5.4 Messages sent by the system
| Trigger | Channel | Content |
|---|---|---|
| Register | E-mail | Verify address |
| Organizer sends invite | WhatsApp / SMS / e-mail / link | Personalized invite link |
| RSVP yes | E-mail/WhatsApp (if contact) | Confirmation + ticket |
| Payment success | E-mail/WhatsApp | Receipt + QR ticket |
| 24 h & 2 h before | WhatsApp/e-mail | Reminder + place |
| Non-responder nudge | WhatsApp/e-mail | Reminder to answer before deadline |
| After event | WhatsApp/e-mail | "Thanks — photos: link" (confirmed guests only) |
| 3 days before album expiry | WhatsApp/e-mail | Last-chance download |

---

## 6. What changes vs the React prototype
- Real accounts and per-event authorization (prototype used a secret in the browser).
- Unguessable guest tokens instead of `?g=Name`.
- Server-enforced capacity/deadline inside transactions; real payments via verified webhooks (prototype trusted the client).
- Photos in object storage with thumbnails and scheduled purge (prototype: base64 in DB).
- Automated reminders (prototype: manual `wa.me` links).

## 7. Open decisions **[DECIDE]**
1. **Money flow**: platform collects and pays out organizers (needs KYC/payout/compliance) **vs** organizer plugs their own provider keys (simpler, platform takes no float) **vs** platform only sells its own packages and ticket money goes straight to organizer's provider account.
2. **Kwabor's business model**: free + per-event packages (like invitz Lite/Pro/Platinum by guest count), commission on tickets, or both?
3. **Countries/currencies at launch** (decides gateway: FedaPay vs CinetPay vs both) and whether foreign cards are in v1.
4. **WhatsApp**: official Cloud API (cost + template approval + verified business) in v1, or `wa.me` links in v1 and automate in v2?
5. **Door staff role** with scanner PIN in v1?
6. **Waitlist** when full, or just "complet"?
7. **Guests uploading photos** too, or organizer only (as in description)?
8. **Languages**: FR only at launch, or FR+EN?
9. **Hosting**: VPS + Forge/Ploi (cheap, you manage) vs Laravel Cloud (managed, pricier)?
10. **Draft/publish** state and "event ended" behavior (read-only?).

---

## 8. Decisions taken (2026-10-16) — supersede section 7 where they overlap

| # | Decision | Consequence for the build |
|---|---|---|
| 1, 2 | **Deferred** (money flow, business model) | Paid events are built behind a `PaymentGateway` interface with a fake/test driver; real FedaPay integration, payouts and pricing/packages wait for these decisions. Free events are fully functional. |
| 3 | West Africa, **Benin first** | Currency XOF (FCFA), default timezone Africa/Porto-Novo, phone default +229, FedaPay is the first gateway candidate (Benin-native). |
| 4 | **`wa.me` links** | No WhatsApp API in v1. "Send" buttons open a pre-filled chat. Reminders that must be automatic go by **e-mail**; WhatsApp reminders are organizer-triggered. Remove WhatsApp from the automated-message table. |
| 5 | **Door staff = third user type** via scanner link | See 8.1. |
| 6 | **Capacity**: if the organizer sets a limit → "Complet" at the limit. If no limit → RSVPs close at the deadline and the organizer gets the final total. | Capacity nullable = unlimited. At deadline a scheduled job freezes the count and e-mails/stores a summary (yes, no, pending, headcount incl. companions). |
| 7 | **Photos: organizer upload only**; guests view and download | No guest upload endpoints. |
| 8 | **FR + EN** | Laravel lang files + react-i18next (or Inertia-shared translations); guest picks language on the invite, organizer sets the event's default; FR default. |
| 9 | **VPS + Forge/Ploi** | Deploy scripts, queue worker + scheduler under supervisor/cron as Forge manages them. |
| 10 | **Draft → Published → Ended**, ended = **read-only** | Status machine on `events`. Draft: invite links inactive. Ended (starts_at + grace, or manual): RSVPs, edits, check-in and gifts locked; album and stats remain. |

### 8.1 Door staff (scanner) flow
- Organizer opens the event → **Door staff** tab → [Créer un lien scanner] (can create several, label each, revoke any).
- Link: `/scan/{scanner_token}` — long random token stored hashed, bound to one event, **no account**. Works only between publish and event end + grace; revocable.
- Staff opens the link on a phone → **Scanner UI**: camera scan (needs HTTPS; fine in prod and on localhost), manual search by name/number as fallback, live counter "X sur Y personnes arrivées".
- On scanning a guest QR the server, in one transaction: verifies the signature, checks the ticket belongs to this event, and
  - **valid & unused** → marks `used_at`, increments attendance by 1 + companions, shows green "Bienvenue {name}, table {t}";
  - **already used** → red "Déjà scanné à {hh:mm}" (code is disabled, count unchanged);
  - **invalid / other event / not confirmed / paid but unpaid** → red with reason.
- Scanner sees only: name, number, companions, table. No guest list, phones or e-mails.
- Organizer's Check-in tab shows the same live count plus scan log (who, when, which scanner link).
- **Decided: one QR per RSVP.** Companions are declared and confirmed by the guest in their RSVP (count can be edited by the guest until the deadline); no separate QR per companion.
- The scan result screen always shows the staff member: **guest name + number of companions** (e.g. "Awa Diallo · +2 → 3 personnes"), plus badge number and table, so they can admit the right number of people. Attendance increments by 1 + companions.

### 8.2 Updated data/flow additions
- `events.status` (draft|published|ended), `events.capacity` nullable, `events.rsvp_closed_at`, `events.locale`.
- `scanner_links`: id, event_id, label, token_hash, revoked_at, last_used_at.
- `tickets.used_at`, `tickets.used_by_scanner_link_id`; `rsvps.checked_in_at` derived from the ticket scan.
- `event_summaries` (or columns on events): totals frozen at deadline.
- Roles are now: **Organizer** (account), **Guest** (invite token), **Door staff** (scanner token).

### 8.3 Build order proposed
1. Foundation: i18n FR/EN, UI kit + palettes, event model + status machine, policies.
2. Organizer: dashboard, create/edit wizard, guests, general + personalized links.
3. Guest: invite page, RSVP, capacity/deadline rules, badge, .ics, gifts, maps.
4. Door staff: scanner links, scanner UI, ticket signing/invalidation.
5. Photos + album + retention purge.
6. E-mail reminders + scheduler, deadline summary.
7. Payments (after decisions 1–2): gateway interface first, FedaPay when unblocked.

---

## 9. As built (2026-10-17) — deviations from the plan above
- **Ticket QR** is a random 40-char code looked up server-side (not an HMAC payload); the QR text is `kwabor:<code>`. Equivalent security, simpler.
- **Price is per person** (guest + companions each pay); a paid RSVP's companions are frozen after payment.
- **Events auto-end** 24 h after start (`events:close-finished`, config `kwabor.event_grace_hours`) — scanner and RSVPs lock then; photos stay manageable.
- **Wizard → single-page form** with live preview (sections instead of steps).
- **Door staff** tokens are stored hashed (lookup) + encrypted (so the organizer can copy the link again).
- **Reminders**: e-mail only (24 h before, hourly scheduler); WhatsApp stays `wa.me` buttons.
- **No server image library** (PHP has no GD): photos are resized in the browser; no thumbnails, no zip download.
- **Payments** run through `PaymentGateway` with a `FakeGateway` (config `PAYMENT_DRIVER=fake`); Plans/Payouts pages are placeholders (decisions 1–2 pending).
