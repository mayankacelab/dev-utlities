/**
 * Cloudflare Worker — HubSpot API proxy with Google OAuth
 *
 * Required secrets (set via Cloudflare dashboard or wrangler):
 *   HUBSPOT_PAT        — HubSpot Private App Token
 *   GOOGLE_CLIENT_ID   — Google OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET — Google OAuth 2.0 client secret
 *   COOKIE_SECRET      — Random string used to sign session cookies (run: openssl rand -hex 32)
 *
 * Required vars (set in wrangler.toml [vars]):
 *   ALLOWED_ORIGIN     — GitHub Pages origin, e.g. https://mayankacelab.github.io
 */

const ALLOWED_DOMAIN = "acelabusa.com";
const COOKIE_NAME = "hsm_session";
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// --- Cookie signing (HMAC-SHA256) ---

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlEncode(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str) {
  return JSON.parse(atob(str.replace(/-/g, "+").replace(/_/g, "/")));
}

async function makeSession(email, secret) {
  const payload = b64urlEncode({ email, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE });
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

async function verifySession(value, secret) {
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmacSign(payload, secret);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = b64urlDecode(payload);
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(request) {
  const cookies = {};
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    cookies[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return cookies;
}

async function getSession(request, env) {
  const value = parseCookies(request)[COOKIE_NAME];
  return value ? verifySession(value, env.COOKIE_SECRET) : null;
}

// --- Auth handlers ---

function handleLogin(request, env) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || env.ALLOWED_ORIGIN;
  const state = btoa(encodeURIComponent(redirectTo));

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });

  return Response.redirect(`${GOOGLE_AUTH_URL}?${params}`, 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  let redirectTo = env.ALLOWED_ORIGIN;
  try { redirectTo = decodeURIComponent(atob(state)); } catch {}

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return new Response("Failed to exchange authorization code", { status: 500 });
  }

  const tokens = await tokenRes.json();
  let email;
  try {
    const [, payload] = tokens.id_token.split(".");
    email = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).email;
  } catch {
    return new Response("Failed to read identity token", { status: 500 });
  }

  if (!email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;max-width:480px;margin:auto">
        <h2 style="margin-bottom:8px">Access denied</h2>
        <p style="color:#555;margin-bottom:20px">Only <strong>@${ALLOWED_DOMAIN}</strong> accounts can access this tool.<br>You signed in as <strong>${email || "unknown"}</strong>.</p>
        <a href="/auth/login" style="padding:8px 16px;background:#1a1a18;color:#fff;border-radius:6px;text-decoration:none;font-size:14px">Try a different account</a>
      </body></html>`,
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }

  const sessionValue = await makeSession(email, env.COOKIE_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": `${COOKIE_NAME}=${sessionValue}; HttpOnly; Secure; SameSite=None; Max-Age=${SESSION_MAX_AGE}; Path=/`,
    },
  });
}

function handleLogout(env) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${env.ALLOWED_ORIGIN}/dev-utlities/hubspot-sandbox-manager/`,
      "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/`,
    },
  });
}

async function handleMe(request, env) {
  const session = await getSession(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders(env), "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ email: session.email }), {
    headers: { ...corsHeaders(env), "Content-Type": "application/json" },
  });
}

// --- HubSpot proxy ---

async function proxyHubSpot(request, env, url) {
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

  return new Response(await response.text(), {
    status: response.status,
    headers: { ...corsHeaders(env), "Content-Type": "application/json" },
  });
}

// --- Main handler ---

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth/login") return handleLogin(request, env);
    if (url.pathname === "/auth/callback") return handleCallback(request, env);
    if (url.pathname === "/auth/logout") return handleLogout(env);
    if (url.pathname === "/auth/me") return handleMe(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (url.pathname.startsWith("/api/hubspot")) {
      const session = await getSession(request, env);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders(env), "Content-Type": "application/json" },
        });
      }
      return proxyHubSpot(request, env, url);
    }

    return new Response("Not found", { status: 404 });
  },
};
