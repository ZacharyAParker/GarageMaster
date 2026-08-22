# GarageMaster

Auto shop management app built with React + Vite. No backend, no accounts to sign up for, nothing phones home. All data lives in your browser's localStorage.

I wanted a shop tracker I could actually self-host without standing up a database server, so this runs entirely client side. Open it in a browser, create the admin account on first launch, and go.

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
* Runs entirely in the browser. Deploy it anywhere static files are served
* PBKDF2 password hashing with per user salts, hashes never leave the data layer
* Role based access - admins, managers, service advisors, mechanics, parts specialists all see different things
* JSON backup/restore built into settings for moving between machines or just keeping backups
* Cross tab sync, so two browsers on the same shop machine stay current with each other
* Ctrl+K search across jobs, customers, vehicles and invoices
* Demo data seeder on first launch if you want to click around before entering real work
* Configurable tax rate and default labor rate used across billing

## Tech stack

React 18, Vite 6, React Router, TanStack Query, Recharts, Tailwind CSS with Radix UI components, lucide icons. Persistence is a small custom localStorage client in `src/api/client.js`.

## Running it

Needs Node 18+. 

```bash
npm install
npm run dev
```

Dev server lands on http://localhost:5173.

## Docker

Multi stage build: Vite compiles the app in node, then nginx serves the static bundle with SPA routing handled:

```bash
docker compose up -d --build
```

That serves on port 8088. No volumes needed since data is per browser. Put it behind your reverse proxy or expose the port directly for LAN use.

## How the code is laid out

* `src/api/client.js` - data layer: entity CRUD, auth, shop settings, backup/restore, cross tab broadcast
* `src/api/entities.js` - entity exports (Customer, Vehicle, Job, Inspection, InventoryItem, Quote, Invoice, Message, Event, Notification, StockMovement)
* `src/lib/constants.js` - shared status lists, labels and badge colors
* `src/lib/format.js` - money and date formatting helpers
* `src/utils/demoData.js` - demo data seeder
