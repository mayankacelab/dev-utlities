# HubSpot Sandbox Manager

Web app for managing HubSpot **sandbox** companies and feature flags.
Runs via a lightweight local Node.js proxy to avoid browser CORS restrictions.

## What it does

- Search companies by **name, domain, or `company_id`** UUID
- Browse all companies with paginated load-more
- View full company detail (all MH properties, address, dates)
- Toggle `mh_feature_flags` — save / clear / enable all
- Create new companies with optional flags, lifecycle stage, type, address, and custom `company_id` UUID
- Duplicate `company_id` check before creating

## Setup

1. Get the HubSpot sandbox Private App Token (PAT) from **Mayank**
2. Install dependencies:
   ```bash
   cd hubspot-sandbox-manager
   npm install
   ```
3. Start the local server:
   ```bash
   npm start
   ```
4. Open [http://localhost:8080](http://localhost:8080) in your browser
5. Paste the PAT on first load — stored in `localStorage`, never leaves your machine

## Why a local server?

HubSpot's API does not allow direct browser-to-API requests (CORS). The included `server.js` acts as a lightweight proxy — the browser calls `localhost`, and the server forwards requests to `api.hubapi.com` server-side.

## Valid mh_feature_flags
- `AECO_Revit_Keynotes`
- `AECO_SpecPlanner_Pro`
- `AECO_Document_Builder`

## Technical notes

- Vanilla HTML + JS frontend, no framework or build tool
- Express proxy (`server.js`) forwards `/api/hubspot/*` to `api.hubapi.com`
- PAT persisted in `localStorage` — clears on browser data wipe
- Dark mode auto-adapts via `prefers-color-scheme`