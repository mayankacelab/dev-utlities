# HubSpot Sandbox Manager

Static web app hosted on GitHub Pages, with a Cloudflare Worker as a lightweight proxy to the HubSpot API.

## What it does

- Search companies by name, domain, or `company_id` UUID
- Browse all companies with paginated load-more
- View full company detail (MH properties, address, dates)
- Toggle `mh_feature_flags` — save / clear / enable all
- Create new companies with flags, lifecycle stage, type, address, and custom `company_id`
- Duplicate `company_id` check before creating

## Architecture

```
Browser (GitHub Pages)  →  Cloudflare Worker  →  api.hubapi.com
```

The Worker is a CORS proxy — HubSpot's API blocks direct browser requests, so the Worker forwards them server-side. The HubSpot PAT is stored as a secret on Cloudflare (never in the code or browser).

## Setup

### 1. Deploy the Cloudflare Worker

```bash
cd hubspot-sandbox-manager
npm install
npx wrangler login
npx wrangler secret put HUBSPOT_PAT   # paste your HubSpot Private App Token
npm run worker:deploy
```

Copy the Worker URL shown after deploy (e.g. `https://hubspot-sandbox-manager.YOUR_SUBDOMAIN.workers.dev`).

### 2. Update index.html

Replace `WORKER_URL` near the top of the `<script>` in `index.html`:

```js
const WORKER_URL = "https://hubspot-sandbox-manager.YOUR_SUBDOMAIN.workers.dev";
```

Commit and push — GitHub Pages will serve the updated file automatically.

### 3. Enable GitHub Pages

In the repo: **Settings → Pages → Deploy from branch `main`, folder `/ (root)`**

Your app will be live at:
`https://mayankacelab.github.io/dev-utlities/hubspot-sandbox-manager/`

## Local development

```bash
npm run worker:dev   # starts Worker locally at http://localhost:8787
```

Then open `index.html` directly in a browser — update `WORKER_URL` to `http://localhost:8787` temporarily for local testing.

## Valid mh_feature_flags
- `AECO_Revit_Keynotes`
- `AECO_SpecPlanner_Pro`
- `AECO_Document_Builder`
