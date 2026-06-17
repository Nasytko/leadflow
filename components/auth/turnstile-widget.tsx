"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  onToken,
  className,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  const scriptId = useMemo(() => "cf-turnstile-script", []);

  useEffect(() => {
    if (document.getElementById(scriptId)) {
      setLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.id = scriptId;
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, [scriptId]);

  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;
    if (!window.turnstile) return;

    el.innerHTML = "";
    const widgetId = window.turnstile.render(el, {
      sitekey: siteKey,
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });

    return () => {
      try {
        window.turnstile?.reset(widgetId);
      } catch {
        // ignore
      }
    };
  }, [loaded, onToken, siteKey]);

  return <div ref={containerRef} className={className} />;
}

