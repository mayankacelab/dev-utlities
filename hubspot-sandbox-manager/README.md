# HubSpot Sandbox Manager

A web app for managing HubSpot sandbox companies and feature flags.
Hosted on GitHub Pages — no login required, just open and use.

**URL:** https://mayankacelab.github.io/dev-utlities/hubspot-sandbox-manager/

---

## How to use

### Searching for a company

1. Open the app — you land on the **Search & Manage** tab
2. Type a company **name**, **domain**, or **company_id UUID** into the search box
3. Click **Search** or press Enter
4. Results show the company name, domain, lifecycle stage, and active feature flags
5. Click anywhere on a row to open the company detail view

> Can't remember the name? Click **Browse All** to list every company. Use **Load more** at the bottom to page through results.

---

### Managing feature flags

1. Find and click a company to open its detail view
2. The **Feature flags** section shows all available flags loaded from HubSpot
3. Click a flag pill to toggle it on (green) or off (grey)
4. Click **Save flags** to write the changes to HubSpot
5. Use **Enable all** to turn on all flags at once, or **Clear all** to remove them all

---

### Adding a new flag option

1. Click the **Flag Options** tab
2. The table lists all flag options currently defined in HubSpot
3. Type a new flag name in the input (e.g. `AECO_New_Feature` or just `New_Feature` — the `AECO_` prefix is added automatically)
4. Click **Add option** — this updates the `mh_feature_flags` property definition in HubSpot and makes the new flag available to all companies immediately

---

### Creating a new company

1. Click the **Create Company** tab
2. Fill in the fields — only **Name** is required, everything else is optional:
   - `company_id` — paste the UUID from your system (used to link the HubSpot record back to your app)
   - `Domain`, `Phone`, `Address` fields
   - `Lifecycle stage` — defaults to Lead
   - `Type` — Partner or Vendor
   - `Feature flags` — select any flags to enable from the start
3. Click **Create company**
   - If the `company_id` is already mapped to another company, you'll get a warning before anything is created

---

## Feature flags reference

Flag options are managed dynamically — the app loads them from the HubSpot `mh_feature_flags` property definition at startup. Use the **Flag Options** tab to view all current options or add new ones.

Flags are stored on the company's `mh_feature_flags` property as a semicolon-separated string (e.g. `AECO_Revit_Keynotes;AECO_SpecPlanner_Pro`). All flag names follow the `AECO_` prefix convention.

---

## Architecture & setup (for developers)

```
Browser (GitHub Pages)  →  Cloudflare Worker  →  api.hubapi.com
```

The Cloudflare Worker acts as a proxy — HubSpot's API blocks direct browser requests, so the Worker forwards them server-side with the HubSpot PAT stored securely as a Cloudflare secret.

### Deploying the Worker

```bash
cd hubspot-sandbox-manager
npm install
npx wrangler login
npx wrangler secret put HUBSPOT_PAT   # paste the HubSpot Private App Token
npm run worker:deploy
```

After deploy, update `WORKER_URL` in `index.html` with the URL printed by Wrangler, then commit and push.

### Enabling GitHub Pages

**Settings → Pages → Deploy from branch `main`, folder `/ (root)`**

### Local development

```bash
npm run worker:dev   # Worker runs at http://localhost:8787
```

Update `WORKER_URL` in `index.html` to `http://localhost:8787` for local testing.
