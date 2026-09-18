import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Pix Chat — a helpful, knowledgeable AI assistant for everyday use.

- Be concise and accurate. Use Markdown formatting, including fenced code blocks with language hints for code.
- When the user asks for code, prefer clean, modern, working examples with brief explanations.
- If a question is ambiguous, ask a single clarifying question instead of guessing.
- Cite sources inline as [n] when web search results are provided, and list them at the end.`;

const PREMIUM_MODEL_DEFAULT = "openai/gpt-5.3-chat";
const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nex-agi/nex-n2.5-pro:free",
  "google/gemma-4-26b-a4b-it:free",
];

async function resetFreeCreditsIfNeeded(supabase: any, userId: string, profile: any) {
  const resetAt = new Date(profile.free_credits_reset_at);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (resetAt < todayStart) {
    await supabase.from("profiles").update({
      free_credits: 20,
      free_credits_reset_at: now.toISOString(),
    }).eq("user_id", userId);
    return { ...profile, free_credits: 20, free_credits_reset_at: now.toISOString() };
  }
  return profile;
}

async function getConfig(supabase: any, key: string, fallback: string) {
  const { data } = await supabase.from("platform_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

async function autoTitleThread(
  supabase: any,
  threadId: string,
  userId: string,
  firstUserMessage: string,
  openrouterKey: string,
) {
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pixengineer.com",
        "X-Title": "Pix Engineer",
      },
      body: JSON.stringify({
        model: FREE_MODELS[0],
        messages: [
          { role: "system", content: "Generate a concise 3-6 word title for this conversation. Reply with only the title, no quotes, no punctuation at the end." },
          { role: "user", content: firstUserMessage.slice(0, 500) },
        ],
        max_tokens: 24,
      }),
    });
    if (!resp.ok) return;
    const json = await resp.json();
    const title = (json?.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "").slice(0, 80);
    if (title) {
      await supabase.from("chat_threads").update({ title }).eq("id", threadId).eq("user_id", userId);
    }
  } catch (e) {
    console.error("autoTitleThread error", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { threadId, messages, useWebSearch = false, forceFreeModel = false } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    // Anonymous users: skip thread + persistence, force free model
    const isAnonymous = !userId;
    let thread: { id: string; title: string } | null = null;
    let useFreeModel = forceFreeModel || isAnonymous;
    let paidCreditsAvailable = 0;
    let creditCost = 0;

    if (!isAnonymous) {
      if (!threadId) {
        return new Response(JSON.stringify({ error: "threadId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: t } = await supabase
        .from("chat_threads").select("id, title").eq("id", threadId).eq("user_id", userId).maybeSingle();
      if (!t) {
        return new Response(JSON.stringify({ error: "Thread not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      thread = t;

      const { data: rawProfile } = await supabase
        .from("profiles")
        .select("free_credits, credit_balance, is_active, free_credits_reset_at")
        .eq("user_id", userId).single();
      if (!rawProfile?.is_active) {
        return new Response(JSON.stringify({ error: "Account deactivated." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const profile = await resetFreeCreditsIfNeeded(supabase, userId, rawProfile);
      creditCost = parseInt(await getConfig(supabase, "credits_chat_message", "2"));
      paidCreditsAvailable = profile.credit_balance ?? 0;
      if (!useFreeModel) useFreeModel = paidCreditsAvailable < creditCost;
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    let model = useFreeModel
      ? FREE_MODELS[0]
      : await getConfig(supabase, "chat_model", PREMIUM_MODEL_DEFAULT);

    const webPlugin = useWebSearch ? [{ id: "web", max_results: 5 }] : undefined;
    const buildModel = (m: string) => m;

    // Persist user message only when authenticated
    const lastUser = messages[messages.length - 1];
    if (!isAnonymous && lastUser?.role === "user") {
      const contentText = typeof lastUser.content === "string"
        ? lastUser.content
        : Array.isArray(lastUser.content)
          ? lastUser.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n")
          : "";
      const attachments = Array.isArray(lastUser.content)
        ? lastUser.content.filter((p: any) => p.type === "image_url").map((p: any) => ({ type: "image", url: p.image_url?.url?.slice(0, 200) }))
        : [];
      await supabase.from("chat_messages").insert({
        thread_id: threadId, user_id: userId,
        role: "user", content: contentText, attachments,
        used_web_search: useWebSearch,
      });
    }

    const callOpenRouter = (selectedModel: string) => fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://pixengineer.com",
          "X-Title": "Pix Engineer",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          ...(webPlugin ? { plugins: webPlugin } : {}),
          stream: true,
        }),
      }
    );

    let response = await callOpenRouter(buildModel(model));

    if (!response.ok && !useFreeModel && [402, 429, 500, 502, 503, 504].includes(response.status)) {
      console.error("Premium chat model failed, falling back to free", response.status);
      useFreeModel = true;
      model = FREE_MODELS[0];
      response = await callOpenRouter(buildModel(model));
    }
    if (!response.ok && useFreeModel) {
      for (const m of FREE_MODELS.slice(1)) {
        model = m;
        response = await callOpenRouter(buildModel(model));
        if (response.ok) break;
      }
    }

    if (!response.ok) {
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Paid credits exhausted.", code: "credits_exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await response.text();
      console.error("OpenRouter chat error:", response.status, txt);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits for premium (authenticated only)
    if (!isAnonymous && !useFreeModel && creditCost > 0) {
      await supabase.from("profiles").update({
        credit_balance: Math.max(0, paidCreditsAvailable - creditCost),
      }).eq("user_id", userId);
    }

    // For anonymous users, stream straight through with no persistence
    if (isAnonymous) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Tee the stream so we can persist the assistant message
    const [streamForClient, streamForCapture] = response.body!.tee();

    const finalModel = buildModel(model);
    const finalUseWebSearch = useWebSearch;
    const isFirstExchange = messages.filter((m: any) => m.role === "user").length === 1
      && (thread!.title === "New chat" || !thread!.title);

    (async () => {
      try {
        const reader = streamForCapture.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";
        let buffer = "";
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
              if (typeof delta === "string") assistantText += delta;
            } catch { /* ignore */ }
          }
        }
        if (assistantText) {
          await supabase.from("chat_messages").insert({
            thread_id: threadId, user_id: userId, role: "assistant",
            content: assistantText, model: finalModel, used_web_search: finalUseWebSearch,
          });
          await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() })
            .eq("id", threadId).eq("user_id", userId);
        }
        if (isFirstExchange && lastUser?.role === "user") {
          const firstText = typeof lastUser.content === "string"
            ? lastUser.content
            : Array.isArray(lastUser.content)
              ? lastUser.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
              : "";
          if (firstText) await autoTitleThread(supabase, threadId, userId, firstText, OPENROUTER_API_KEY);
        }
      } catch (e) {
        console.error("stream capture failed", e);
      }
    })();

    return new Response(streamForClient, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
