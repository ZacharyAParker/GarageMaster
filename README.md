
## Running the app

```bash
npm install
npm run dev
# GarageMaster

A self-hosted auto shop management app built with React + Vite. No external services required—data lives entirely in your browser's localStorage.

## Features

- Self-hosted: runs fully in the browser, no backend required
- Local persistence: data stored under a single localStorage key per origin
- First-time setup flow to create the first admin
- Password-based authentication with PBKDF2 hashing (SHA-256)
- Role-based permissions with a simple PermissionGate component
- Core modules: Dashboard, Jobs, Customers, Vehicles, Employees, Inventory, Inspections
- Modern UI with Tailwind CSS, Radix UI, and React Query

## Tech stack

- React 18, Vite 6, React Router
- @tanstack/react-query for data fetching and cache
- Tailwind CSS + Radix UI + lucide-react for UI
- localStorage for persistence via a small in-browser client (`src/api/client.js`)

## Getting started

Prerequisites:

- Node.js 18+ and npm

Install and run (Windows PowerShell shown):

```powershell
npm install
npm run dev
```

Build and preview production:

```powershell
npm run build
npm run preview
```

Available npm scripts (from `package.json`):

- `npm run dev` – start Vite dev server
- `npm run build` – build to `dist/`
- `npm run preview` – preview the production build
- `npm run lint` – run ESLint

## Auth and permissions

- First-time setup: when the app has no users, you’ll be redirected to the Setup page to create the first admin.
- Login: standard email + password. Passwords are hashed in-browser with PBKDF2 (SHA-256, 100k iterations) and stored alongside a per-user salt.
- First-claim passwords: if a user exists without a password (created by an admin), the first successful login sets their password.
- Session: stored in localStorage as the current user id; logging out clears it.
- Permissions: use `src/components/permissions/PermissionGate.jsx` to render UI conditionally for roles (e.g., admin-only actions).

## Data and persistence

- All data is stored in localStorage under the key: `garagemaster_data_v1`.
- Data is per-origin and per-browser. Different browsers/devices will not share data.
- Clearing site data, using private browsing, or changing the domain will reset your data.

Backup/restore:

- Open DevTools → Application → Local Storage → select your origin.
- Find the key `garagemaster_data_v1` and copy its JSON value to back up.
- To restore, paste a previously saved JSON value back into the same key.

## Project structure

```
src/
	api/             # in-browser data client and re-exports
	components/      # UI components by domain
	pages/           # route pages (Dashboard, Jobs, etc.)
	hooks/           # custom hooks
	lib/             # utils/helpers
	main.jsx         # app bootstrap (React Query provider)
```

Key files:

- `src/api/client.js` – localStorage-backed entities, auth, and stubbed integrations
- `src/pages/index.jsx` – routing + auth guards (Setup/Login redirects)
- `src/components/permissions/PermissionGate.jsx` – role-based UI gating

## Deployment notes

- Output is a static site in `dist/`. You can host it on any static host (Netlify, GitHub Pages, Cloudflare Pages, S3, etc.).
- Because data lives in localStorage, it’s bound to the deployed domain and the viewer’s browser. Each user/browser has its own data.
- This design is great for demos, local single-user usage, or kiosks—but avoid storing sensitive data. No server-side storage is used.

## Troubleshooting

- Stuck on Setup/Login: ensure your browser allows localStorage for the site.
- “Lost” data after deploy: verify you’re on the same domain and not in private mode. localStorage is origin-scoped.
- Reset admin/login: delete the key `garagemaster_data_v1` via DevTools to factory-reset the app.
- Build issues: ensure Node 18+; run `npm install` again and then `npm run build`.

## Roadmap ideas

- Optional server-backed storage (SQLite/Postgres + API) while keeping the same UI
- Admin password reset and user management enhancements
- Import/export UX for data backup
- Expanded reporting and analytics

---

Made with React, Vite, and a lightweight in-browser data layer so you can run it anywhere.