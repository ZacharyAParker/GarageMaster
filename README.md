# GarageMaster

Auto shop management app. React frontend, Express API, PostgreSQL storage. Run it on one box or across the shop network - every terminal sees the same live data.

I started this as a fully client side app and moved it to a real backend so multiple browsers (front counter, bays, office) work off one database instead of each having their own copy stuck in localStorage.

## Features

### The daily stuff
* **Dashboard** with live stats, active jobs, inventory alerts, a 6 month revenue trend chart and a shop pulse card (completion rate, avg turnaround, jobs waiting on approval)
* **Work orders** with a 10 stage pipeline (intake through completed), priorities, parts pulled against inventory and full cost breakdowns. There's a labor timer per job so you can clock start/pause/stop and it bills out in quarter hour increments. Jobs get a notes timeline too so techs can leave breadcrumbs
* **Scheduling** - month and day calendar views for appointments, dropoffs, pickups and reminders. Color coded events plus an upcoming widget on the dashboard
* **Quotes and invoices** - quotes go draft -> sent -> accepted -> converted into an invoice. Invoices track partial payments, show aging when they're past due, print clean, and completing payment on one marks the linked job done automatically
* **Inspections** with preset checklists (full service, pre-purchase, brake check) and automatic pass/fail rollup as you fill items in
* **Inventory** - stock levels with low/out indicators, a full movement history per part (who moved what and why), supplier directory with value rollups, printable reorder report

### Around the shop
* **Customers** with lifetime spend stats, job history and notes. Vehicles tracked with status, mileage, open job counts
* **Messaging** between staff, tied to jobs
* **Leaderboard** ranking the crew by XP from completed jobs and revenue. Quality score comes from clean inspections instead of made up ratings
* **Reports** with KPI cards, 12 month revenue chart, work mix breakdown, mechanic performance bars, date range filters and CSV export

### Platform
* PostgreSQL backend. Everything saved is in the database, not somebody's browser
* Live sync: changes from any terminal show up in every other open browser within a second (server-sent events)
* PBKDF2 password hashing with per user salts, done server side. Hashes never leave the server
* Cookie based sessions stored in Postgres, so signing in survives restarts and works from any machine on the network
* Role based access - admins, managers, service advisors, mechanics and parts specialists all see different things
* JSON backup/restore built into settings. Backups from the old localStorage version import cleanly
* Ctrl+K search across jobs, customers, vehicles and invoices
* Demo data seeder if you want to click around before entering real work
* Configurable tax rate and default labor rate used across billing

## Tech stack

React 18, Vite 6, React Router, TanStack Query, Recharts, Tailwind + Radix UI on the front. Express 4 and the `pg` driver on the back. Entity data lives in Postgres JSONB columns, which keeps flexible documents (parts lists, line items, timelines) without a pile of migrations while staying queryable and indexable.

## Running it

For development you need Node 18+ plus a Postgres database.

```bash
npm install
npm run server   # API on :4000, reads PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD
npm run dev      # Vite dev server on :5173, proxies /api to :4000
```

First launch walks you through creating the admin account.

## Docker

The easy path. One compose file brings up Postgres and the app:

```bash
docker compose up -d --build
```

App lands on port 8088. Data persists in the `garagemaster-pgdata` volume. Set `PGPASSWORD` in the environment if you want something other than the default postgres/postgres pair. Behind a reverse proxy, forward everything to port 8088 - both the SPA and the API are served from there.

## How the code is laid out

* `server/index.js` - Express app, static file serving, SSE stream, schema bootstrap
* `server/routes/` - auth (sessions, password flows, admin user management), generic entity CRUD, settings, backup/restore, uploads
* `src/api/client.js` - data client the UI talks to. Same interface as the old localStorage version, just HTTP underneath
* `src/api/entities.js` - entity exports (Customer, Vehicle, Job, Inspection, InventoryItem, Quote, Invoice, Message, Event, Notification, StockMovement)
* `src/lib/constants.js` - shared status lists, labels and badge colors
* `scripts/verify-server.mjs` - end to end test suite for the API (`npm run verify:server`)

## Migrating from an old install

If you ran the localStorage-only version: open it, go to Settings > Data, export the backup, then use restore in the new version's Settings > Data tab. Users come over without passwords (everyone claims theirs on next sign in), which is deliberate since hashes were never exportable.
