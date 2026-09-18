import { supabase, CUSTOM_API_URL } from "@/lib/supabase-custom";

const CHAT_URL = `${CUSTOM_API_URL}/functions/v1/chat`;
const DEFAULT_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function resilientFetch(init: RequestInit) {
  try {
    const res = await fetch(CHAT_URL, init);
    if (res.status === 403 && CHAT_URL !== DEFAULT_CHAT_URL) {
      const body = await res.clone().text().catch(() => "");
      if (body.includes("CNAME Cross-User Banned") || body.includes("Error 1014")) {
        return fetch(DEFAULT_CHAT_URL, init);
      }
    }
    return res;
  } catch (e) {
    if (CHAT_URL !== DEFAULT_CHAT_URL) return fetch(DEFAULT_CHAT_URL, init);
    throw e;
  }
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessageInput = {
  role: "user" | "assistant";
  content: string | ChatContentPart[];
};

export type StreamOptions = {
  threadId?: string;
  messages: ChatMessageInput[];
  useWebSearch?: boolean;
  forceFreeModel?: boolean;
  onDelta: (text: string) => void;
  signal?: AbortSignal;
};

export type StreamResult = { ok: true } | { ok: false; code?: string; status?: number; error: string };

export async function streamChat(opts: StreamOptions): Promise<StreamResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      threadId: opts.threadId,
      messages: opts.messages,
      useWebSearch: !!opts.useWebSearch,
      forceFreeModel: !!opts.forceFreeModel,
    }),
    signal: opts.signal,
  };

  let res: Response;
  try {
    res = await resilientFetch(init);
  } catch (e) {
    if (opts.signal?.aborted || (e as any)?.name === "AbortError") return { ok: true };
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }

  if (!res.ok || !res.body) {
    let code: string | undefined;
    let error = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      code = j.code; error = j.error ?? error;
    } catch { /* ignore */ }
    return { ok: false, code, status: res.status, error };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string") opts.onDelta(delta);
        } catch { /* ignore non-json */ }
      }
    }
  } catch (e) {
    if (opts.signal?.aborted || (e as any)?.name === "AbortError") return { ok: true };
    return { ok: false, error: e instanceof Error ? e.message : "Stream error" };
  }
  return { ok: true };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
