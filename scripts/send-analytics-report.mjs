#!/usr/bin/env node

const ACCOUNT_ID = "b3c5ab2228da670f1164d69763bdb46f";
const DATABASE_ID = "889c6a2a-03bc-4ef1-b34c-b6548bb28148";
const DEFAULT_FROM = "Runrunrun Analytics <onboarding@resend.dev>";

const {
  CLOUDFLARE_API_TOKEN,
  RESEND_API_KEY,
  ANALYTICS_REPORT_TO,
  ANALYTICS_REPORT_FROM = DEFAULT_FROM,
} = process.env;

for (const [name, value] of Object.entries({
  CLOUDFLARE_API_TOKEN,
  RESEND_API_KEY,
  ANALYTICS_REPORT_TO,
})) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const reportDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
}).format(new Date());
const easternSecondFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "America/New_York",
  timeZoneName: "short",
});

const sql = `
WITH recent AS (
  SELECT *
  FROM visits
  WHERE created_at >= datetime('now', '-24 hours')
),
sessions AS (
  SELECT
    session_id,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen,
    COUNT(*) AS events,
    SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) AS page_views,
    MAX(duration_sec) AS max_duration_sec,
    GROUP_CONCAT(DISTINCT path) AS paths,
    MAX(origin) AS origin,
    MAX(country) AS country,
    MAX(region) AS region,
    MAX(city) AS city,
    MAX(timezone) AS timezone,
    MAX(user_agent) AS user_agent,
    MAX(device_json) AS device_json
  FROM recent
  GROUP BY session_id
)
SELECT *
FROM sessions
ORDER BY last_seen DESC
LIMIT 50;
`;

async function queryD1(sqlText) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: sqlText }),
    },
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Cloudflare D1 query failed: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.result?.[0]?.results ?? [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseDevice(row) {
  try {
    return JSON.parse(row.device_json || "{}");
  } catch {
    return {};
  }
}

function fmtDuration(sec) {
  const n = Number(sec) || 0;
  if (n < 60) return `${n}s`;
  const minutes = Math.floor(n / 60);
  const seconds = n % 60;
  return `${minutes}m ${seconds}s`;
}

function fmtEasternSecond(sqliteUtc) {
  if (!sqliteUtc) return "";
  return easternSecondFormatter.format(new Date(`${sqliteUtc.replace(" ", "T")}Z`));
}

function browserLabel(userAgent) {
  const ua = userAgent || "";
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  const edge = ua.match(/Edg\/([\d.]+)/);
  if (edge) return `Edge ${edge[1]}`;
  if (firefox) return `Firefox ${firefox[1]}`;
  if (chrome) return `Chrome ${chrome[1]}`;
  if (safari) return `Safari ${safari[1]}`;
  return "Unknown";
}

function osLabel(userAgent, device) {
  const ua = userAgent || "";
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS/iPadOS";
  return device.platform || "Unknown";
}

function renderHtml(rows) {
  const bodyRows = rows.length
    ? rows.map((row) => {
      const device = parseDevice(row);
      return `
        <tr>
          <td>${escapeHtml(fmtEasternSecond(row.first_seen))}</td>
          <td>${escapeHtml(fmtEasternSecond(row.last_seen))}</td>
          <td>${escapeHtml(row.page_views)}</td>
          <td>${escapeHtml(row.events)}</td>
          <td>${escapeHtml(row.max_duration_sec ?? 0)}</td>
          <td>${escapeHtml(fmtDuration(row.max_duration_sec))}</td>
          <td>${escapeHtml([row.city, row.region, row.country].filter(Boolean).join(", "))}</td>
          <td>${escapeHtml(browserLabel(row.user_agent))}</td>
          <td>${escapeHtml(osLabel(row.user_agent, device))}</td>
          <td>${escapeHtml(device.viewport || "")}</td>
          <td>${escapeHtml(row.paths || "")}</td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="11">No visits in the last 24 hours.</td></tr>`;

  return `
<!doctype html>
<html>
  <body style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #111;">
    <h2>Runrunrun Analytics</h2>
    <p>Generated ${escapeHtml(reportDate)}. Window starts ${escapeHtml(since)}.</p>
    <table cellspacing="0" cellpadding="6" border="1" style="border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr>
          <th>First seen ET</th>
          <th>Last seen ET</th>
          <th>Page views</th>
          <th>Events</th>
          <th>Max stay seconds</th>
          <th>Max stay</th>
          <th>IP location</th>
          <th>Browser</th>
          <th>OS</th>
          <th>Viewport</th>
          <th>Paths</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>
`;
}

function renderText(rows) {
  if (!rows.length) return `Runrunrun Analytics\n\nNo visits in the last 24 hours.\n`;
  return [
    "Runrunrun Analytics",
    `Generated ${reportDate}`,
    "",
    ...rows.map((row) => {
      const device = parseDevice(row);
      return [
        `${fmtEasternSecond(row.first_seen)} first seen ET | ${fmtEasternSecond(row.last_seen)} last seen ET`,
        `${row.page_views} page views | ${row.events} events | ${row.max_duration_sec ?? 0} seconds | ${fmtDuration(row.max_duration_sec)}`,
        `${[row.city, row.region, row.country].filter(Boolean).join(", ")} | ${browserLabel(row.user_agent)} | ${osLabel(row.user_agent, device)} | ${device.viewport || ""}`,
        `${row.paths || ""}`,
      ].join("\n");
    }),
  ].join("\n\n");
}

async function sendEmail(rows) {
  const subject = `Runrunrun analytics: ${rows.length} session${rows.length === 1 ? "" : "s"} in 24h`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ANALYTICS_REPORT_FROM,
      to: [ANALYTICS_REPORT_TO],
      subject,
      html: renderHtml(rows),
      text: renderText(rows),
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Resend email failed: ${JSON.stringify(json)}`);
  }
  console.log(`Sent analytics report to configured recipient. Resend id: ${json.id}`);
}

const rows = await queryD1(sql);
await sendEmail(rows);
