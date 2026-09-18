import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Custom API domain routed through Cloudflare to bypass WiFi/ISP blocks on backend domains
const CUSTOM_SUPABASE_URL = "https://api.pixengineer.com";
const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const shouldForceDefaultUrl =
  typeof window !== "undefined" &&
  /(\.lovable\.app|\.lovableproject\.com)$/.test(window.location.hostname);

const ACTIVE_SUPABASE_URL = shouldForceDefaultUrl
  ? DEFAULT_SUPABASE_URL
  : CUSTOM_SUPABASE_URL;

function toUrlString(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function withRewrittenUrl(input: RequestInfo | URL, newUrl: string): RequestInfo | URL {
  if (input instanceof Request) {
    return new Request(newUrl, input);
  }
  return newUrl;
}

const resilientFetch: typeof fetch = async (input, init) => {
  if (ACTIVE_SUPABASE_URL !== CUSTOM_SUPABASE_URL) {
    return fetch(input, init);
  }

  try {
    const response = await fetch(input, init);

    if (response.status === 403) {
      const body = await response.clone().text();
      if (body.includes("CNAME Cross-User Banned") || body.includes("Error 1014")) {
        const currentUrl = toUrlString(input);
        const fallbackUrl = currentUrl.replace(CUSTOM_SUPABASE_URL, DEFAULT_SUPABASE_URL);
        const fallbackInput = withRewrittenUrl(input, fallbackUrl);
        return fetch(fallbackInput, init);
      }
    }

    return response;
  } catch (error) {
    // CORS or network errors - fall back to default URL
    const currentUrl = toUrlString(input);
    const fallbackUrl = currentUrl.replace(CUSTOM_SUPABASE_URL, DEFAULT_SUPABASE_URL);
    const fallbackInput = withRewrittenUrl(input, fallbackUrl);
    return fetch(fallbackInput, init);
  }
};

export const supabase = createClient<Database>(ACTIVE_SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: resilientFetch,
  },
});

export const CUSTOM_API_URL = ACTIVE_SUPABASE_URL;

