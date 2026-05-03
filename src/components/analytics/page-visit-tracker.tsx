"use client";

import { useEffect } from "react";

const ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
const HEARTBEAT_MS = 15_000;
const SESSION_KEY = "runrunrun-analytics-session";

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

function compactDeviceInfo() {
  const nav = navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
      platform?: string;
      brands?: { brand: string; version: string }[];
    };
  };

  return {
    language: navigator.language,
    languages: navigator.languages?.slice(0, 4) ?? [],
    platform: nav.userAgentData?.platform ?? navigator.platform,
    mobile: nav.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    brands: nav.userAgentData?.brands ?? [],
  };
}

export function PageVisitTracker() {
  useEffect(() => {
    if (!ENDPOINT) return;

    const sessionId = getSessionId();
    const startedAt = Date.now();
    let lastSentAt = 0;

    const send = (event: "page_view" | "heartbeat" | "page_hide") => {
      const now = Date.now();
      if (event === "heartbeat" && now - lastSentAt < HEARTBEAT_MS - 1_000) return;
      lastSentAt = now;

      const payload = {
        event,
        sessionId,
        path: window.location.pathname,
        referrer: document.referrer || null,
        durationSec: Math.max(0, Math.round((now - startedAt) / 1000)),
        device: compactDeviceInfo(),
      };

      const body = JSON.stringify(payload);
      if (event === "page_hide" && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
        return;
      }

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: event === "page_hide",
      }).catch(() => {
        // Analytics must never affect the page experience.
      });
    };

    send("page_view");
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") send("heartbeat");
    }, HEARTBEAT_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") send("page_hide");
    };
    const onPageHide = () => send("page_hide");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
