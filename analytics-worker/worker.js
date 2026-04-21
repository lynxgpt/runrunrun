const MAX_BODY_BYTES = 8_192;
const ALLOWED_EVENTS = new Set(["page_view", "heartbeat", "page_hide"]);

function corsHeaders(origin, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || "*";
  const allowOrigin =
    allowedOrigin === "*" || allowedOrigin === origin ? origin || "*" : allowedOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status, origin, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin, env),
    },
  });
}

function textByteLength(text) {
  return new TextEncoder().encode(text).length;
}

function normalizePayload(payload) {
  const event = String(payload.event || "");
  if (!ALLOWED_EVENTS.has(event)) throw new Error("invalid event");

  const sessionId = String(payload.sessionId || "").slice(0, 128);
  if (!sessionId) throw new Error("missing sessionId");

  return {
    event,
    sessionId,
    path: typeof payload.path === "string" ? payload.path.slice(0, 512) : null,
    referrer: typeof payload.referrer === "string" ? payload.referrer.slice(0, 512) : null,
    durationSec: Number.isFinite(payload.durationSec)
      ? Math.max(0, Math.min(86_400, Math.round(payload.durationSec)))
      : 0,
    device: payload.device && typeof payload.device === "object" ? payload.device : {},
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method not allowed" }, 405, origin, env);
    }

    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ ok: false, error: "origin not allowed" }, 403, origin, env);
    }

    const bodyText = await request.text();
    if (textByteLength(bodyText) > MAX_BODY_BYTES) {
      return json({ ok: false, error: "payload too large" }, 413, origin, env);
    }

    let payload;
    try {
      payload = normalizePayload(JSON.parse(bodyText));
    } catch {
      return json({ ok: false, error: "bad request" }, 400, origin, env);
    }

    const cf = request.cf || {};
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      null;

    await env.ANALYTICS_DB.prepare(
      `INSERT INTO visits (
        event, session_id, path, referrer, duration_sec,
        ip, country, region, city, latitude, longitude, timezone,
        user_agent, device_json, origin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        payload.event,
        payload.sessionId,
        payload.path,
        payload.referrer,
        payload.durationSec,
        ip,
        cf.country || null,
        cf.region || null,
        cf.city || null,
        cf.latitude != null ? String(cf.latitude) : null,
        cf.longitude != null ? String(cf.longitude) : null,
        cf.timezone || null,
        request.headers.get("User-Agent") || null,
        JSON.stringify(payload.device),
        origin || null,
      )
      .run();

    return json({ ok: true }, 202, origin, env);
  },
};
