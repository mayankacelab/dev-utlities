/**
 * Cloudflare Worker — HubSpot API proxy
 * Proxies requests from the static web app to api.hubapi.com,
 * bypassing browser CORS restrictions.
 *
 * Required secret (set via Cloudflare dashboard or wrangler):
 *   HUBSPOT_PAT — HubSpot Private App Token
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/hubspot")) {
      return new Response("Not found", { status: 404 });
    }

    const hsPath = url.pathname.replace("/api/hubspot", "") || "/";
    const hsUrl = `https://api.hubapi.com${hsPath}${url.search}`;

    const isReadMethod = request.method === "GET" || request.method === "HEAD";
    const body = isReadMethod ? undefined : await request.text();

    const response = await fetch(hsUrl, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${env.HUBSPOT_PAT}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  },
};
