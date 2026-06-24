import type { ConsentCategories } from "./constants";
import { EXTERNAL_SCRIPTS } from "./registry";
import { hasCategoryConsent, type CookieConsentRecord } from "./consent-model";

type LoadedScripts = {
  analytics: boolean;
  marketing: boolean;
};

let loaded: LoadedScripts = { analytics: false, marketing: false };

function getEnvValue(key: string | undefined): string | undefined {
  if (!key) {
    return undefined;
  }
  const value = process.env[key]?.trim();
  return value || undefined;
}

function appendScript(id: string, src: string, async = true): void {
  if (document.getElementById(id)) {
    return;
  }
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = async;
  document.head.appendChild(script);
}

function loadGa4(measurementId: string): void {
  if (loaded.analytics) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });

  appendScript("tiendafront-ga4", `https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  loaded.analytics = true;
}

function loadGtm(containerId: string): void {
  if (document.getElementById("tiendafront-gtm")) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  appendScript(
    "tiendafront-gtm",
    `https://www.googletagmanager.com/gtm.js?id=${containerId}`,
  );
}

function loadMetaPixel(pixelId: string): void {
  if (loaded.marketing || document.getElementById("tiendafront-meta-pixel")) {
    return;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fbq = function (...args: unknown[]) {
    if ((fbq as any).callMethod) {
      (fbq as any).callMethod(...args);
    } else {
      (fbq as any).queue.push(args);
    }
  } as any;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  appendScript(
    "tiendafront-meta-pixel",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  loaded.marketing = true;
}

function loadClarity(projectId: string): void {
  if (document.getElementById("tiendafront-clarity")) {
    return;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  (window as any).clarity =
    (window as any).clarity ||
    function (...args: unknown[]) {
      ((window as any).clarity.q = (window as any).clarity.q || []).push(args);
    };
  appendScript(
    "tiendafront-clarity",
    `https://www.clarity.ms/tag/${projectId}`,
  );
}

function loadHotjar(siteId: string): void {
  if (document.getElementById("tiendafront-hotjar")) {
    return;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  (window as any)._hjSettings = { hjid: siteId, hjsv: 6 };
  appendScript(
    "tiendafront-hotjar",
    `https://static.hotjar.com/c/hotjar-${siteId}.js?sv=6`,
  );
}

function loadTikTok(pixelId: string): void {
  if (document.getElementById("tiendafront-tiktok")) {
    return;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  (window as any).TiktokAnalyticsObject = "ttq";
  const ttq = ((window as any).ttq = (window as any).ttq || []);
  ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
  appendScript(
    "tiendafront-tiktok",
    `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${pixelId}&lib=ttq`,
  );
}

export function loadConsentedScripts(
  record: CookieConsentRecord | null,
): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const script of EXTERNAL_SCRIPTS) {
    const envValue = getEnvValue(script.envKey);
    if (!envValue) {
      continue;
    }

    if (!hasCategoryConsent(record, script.category)) {
      continue;
    }

    switch (script.id) {
      case "ga4":
        loadGa4(envValue);
        break;
      case "gtm":
        loadGtm(envValue);
        break;
      case "meta-pixel":
        loadMetaPixel(envValue);
        break;
      case "clarity":
        loadClarity(envValue);
        break;
      case "hotjar":
        loadHotjar(envValue);
        break;
      case "tiktok":
        loadTikTok(envValue);
        break;
      case "google-ads":
        if (hasCategoryConsent(record, "marketing")) {
          window.gtag?.("config", envValue);
        }
        break;
      default:
        break;
    }
  }

  if (typeof window !== "undefined") {
    window.__tiendafront_consent_scripts_loaded = {
      analytics: hasCategoryConsent(record, "analytics"),
      marketing: hasCategoryConsent(record, "marketing"),
      preferences: hasCategoryConsent(record, "preferences"),
    };
  }
}

export function resetLoadedScriptsState(): void {
  loaded = { analytics: false, marketing: false };
}

export function getActiveScriptProviders(categories: ConsentCategories): string[] {
  return EXTERNAL_SCRIPTS.filter((script) => {
    const envValue = getEnvValue(script.envKey);
    return envValue && categories[script.category as keyof ConsentCategories];
  }).map((script) => script.provider);
}
