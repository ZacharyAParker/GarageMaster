# GarageMaster

A self-hosted auto shop management app built with React + Vite. No external services are required—all data lives entirely in your browser's `localStorage`.

## Features

* **Self-Hosted**: Runs entirely in the browser with no backend required.
* **Local Persistence**: All data is stored under a single `localStorage` key, scoped to your browser and the domain.
* **First-Time Setup**: A simple workflow to create the initial administrator account.
* **Secure Authentication**: Password-based authentication using PBKDF2 (SHA-256) hashing with a per-user salt.
* **Role-Based Permissions**: Easily restrict access to certain features with a simple `PermissionGate` component.
* **Core Modules**: Includes Dashboard, Jobs, Customers, Vehicles, Employees, Inventory, and Inspections.
* **Modern UI**: Built with Tailwind CSS, Radix UI, and React Query for a responsive and fast experience.

## Tech Stack

* **Framework**: React 18, Vite 6, React Router
* **Data Management**: `@tanstack/react-query` for data fetching and caching
* **UI**: Tailwind CSS, Radix UI, and `lucide-react` for icons
* **Persistence**: A small in-browser client (`src/api/client.js`) that uses `localStorage`

## Getting Started

**Prerequisites:**
* Node.js version 18 or higher
* npm (usually comes with Node.js)

**Installation and Running:**

1.  **Clone the repository and install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The application will now be running on your local machine.

**Available Scripts:**
* `npm run dev`: Starts the Vite development server.
* `npm run build`: Builds the app for production to the `dist/` folder.
* `npm run preview`: Previews the production build locally.
* `npm run lint`: Runs ESLint to check for code quality issues.

## Core Concepts

### Authentication & Permissions

* **First-Time Setup**: When the app detects no existing users, it will redirect you to a setup page to create the first admin account.
* **Login**: Standard email and password login. Passwords are hashed in-browser with PBKDF2 (SHA-256, 100,000 iterations) and stored with a unique salt for each user.
* **First-Claim Passwords**: If an admin creates a new user without a password, the first time that user logs in, they will be prompted to set their password.
* **Session Management**: The current user's session is stored in `localStorage`. Logging out clears this data.
* **Permissions**: Use the `<PermissionGate />` component (`src/components/permissions/PermissionGate.jsx`) to conditionally render UI elements based on user roles (e.g., show a button only for admins).

### Data & Persistence

All application data is stored in your browser's `localStorage` under a single key: `garagemaster_data_v1`.

> **Warning:** This storage method has important limitations:
> * Data is **local to a single browser** on a single device. It will not be shared across different browsers or devices.
> * Using **private or incognito mode** will create a separate, temporary data store that is deleted when the session ends.
> * **Clearing your browser's site data** will permanently delete all information stored by the app.

**Backup & Restore:**
1.  Open your browser's DevTools and navigate to the `Application` tab.
2.  Go to `Local Storage` and select the origin where the app is hosted.
3.  Find the key `garagemaster_data_v1`.
4.  To **back up**, copy the entire JSON string from the value field and save it to a file.
5.  To **restore**, paste a previously saved JSON string back into the value field for that same key.

## Project Structure

````

src/
├── api/          \# In-browser data client and authentication logic
├── components/   \# UI components, organized by domain
├── pages/        \# Route pages (Dashboard, Jobs, etc.)
├── hooks/        \# Custom React hooks
├── lib/          \# Utility functions and helpers
└── main.jsx      \# App bootstrap and React Query provider

```

**Key Files:**
* `src/api/client.js`: The core file for the `localStorage`-backed database, authentication, and data manipulation.
* `src/pages/index.jsx`: Defines application routes and handles auth guards (redirecting to Setup/Login pages).
* `src/components/permissions/PermissionGate.jsx`: The component used for role-based UI rendering.

## Deployment

The output of `npm run build` is a static site located in the `dist/` directory. You can host this folder on any static hosting provider, such as:
* Netlify
* Vercel
* GitHub Pages
* Cloudflare Pages
* AWS S3

Remember that since data is stored in `localStorage`, it is tied to the deployed domain.

## Troubleshooting

* **Stuck on Setup/Login page:** Make sure your browser has `localStorage` enabled for the site.
* **Data seems "lost" after deploying or visiting again:** Confirm you are using the same domain and not in private/incognito mode. `localStorage` is scoped per-origin.
* **How to factory-reset the app:** Open DevTools, find the key `garagemaster_data_v1` in `localStorage`, and delete it. This will trigger the first-time setup flow again.
* **Build issues:** Make sure you are using Node.js v18+. Try deleting your `node_modules` folder and `package-lock.json` file, then run `npm install` again.

## Roadmap Ideas

* Optional server-backed storage (e.g., SQLite/Postgres + API) while keeping the same UI.
* Enhanced user management features, such as an admin password reset.
* A user-friendly import/export feature for data backup and restoration.
* Expanded reporting and analytics dashboards.
```
