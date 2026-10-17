# Kwabor

Digital invitations: create an event, share personalized links, guests answer yes/no, get a numbered badge and a QR ticket;
door staff scan tickets; photo album afterwards. Laravel 12 + Inertia/React/TypeScript. French + English.

- Design & decisions: `docs/ARCHITECTURE.md` · history: `DEV_LOG.md` · user flows: `reference_assets/`

## Run locally
```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed     # demo organizer: demo@kwabor.test / password
composer dev                         # app :8000, queue worker, logs, vite
docker run -d --name mailpit -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit   # local inbox
php artisan test
```
UI strings: edit `scripts/build-lang.py`, then `python3 scripts/build-lang.py`.
Payments use a fake provider (`PAYMENT_DRIVER=fake`) until the money flow is decided.
