import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an elite Prompt Engineer — an expert at crafting, analyzing, and refining AI prompts for any domain.

When a user describes what they need, you should:

1. **Generate** a well-structured, optimized prompt tailored to their use case
2. **Explain** key techniques used (chain-of-thought, few-shot examples, role-setting, constraints, etc.)
3. **Suggest variations** or improvements they can iterate on

## Formatting Rules
- Return the generated prompt inside a markdown code block labeled \`prompt\`
- Use clear section headers with markdown
- Keep explanations concise but insightful
- If the user pastes an existing prompt, analyze its strengths/weaknesses and provide an improved version
- Always consider: clarity, specificity, output format control, edge case handling, and tone

## Prompt Engineering Best Practices to Apply
- Role assignment ("You are a...")
- Clear task decomposition
- Output format specification
- Constraint setting (length, tone, style)
- Few-shot examples when beneficial
- Chain-of-thought reasoning triggers
- Negative constraints ("Do NOT...")
- Temperature/creativity guidance hints

Be creative, thorough, and actionable. The user should be able to copy your generated prompt and use it immediately.`;

const CREDIT_COSTS: Record<string, string> = {
  generate: "credits_prompt_generate",
  refine: "credits_prompt_improve",
  analyze: "credits_prompt_analyze",
};

const PREMIUM_MODEL_FALLBACK = "openai/gpt-5.3-chat";
const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nex-agi/nex-n2.5-pro:free",
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "generate", forceFreeModel = false } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Try to get user - if it's just the anon key, skip auth
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        userId = user.id;
      }
    }

    let useFreeModel = true;
    let creditCost = 0;
    let paidCreditsAvailable = 0;

    if (userId) {
      const { data: rawProfile } = await supabase
        .from("profiles")
        .select("free_credits, credit_balance, is_active, free_credits_reset_at")
        .eq("user_id", userId)
        .single();

      if (rawProfile) {
        if (!rawProfile.is_active) {
          return new Response(JSON.stringify({ error: "Account deactivated." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const profile = await resetFreeCreditsIfNeeded(supabase, userId, rawProfile);

        const costKey = CREDIT_COSTS[mode] || "credits_prompt_generate";
        const { data: costConfig } = await supabase
          .from("platform_config").select("value").eq("key", costKey).single();
        creditCost = parseInt(costConfig?.value ?? "5");
        paidCreditsAvailable = profile.credit_balance ?? 0;
        useFreeModel = forceFreeModel || paidCreditsAvailable < creditCost;
      }
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    let model = PREMIUM_MODEL_FALLBACK;
    if (useFreeModel) {
      model = FREE_MODELS[0];
    } else {
      try {
        const cfgResp = await fetch(`${supabaseUrl}/rest/v1/platform_config?key=eq.prompt_engineer_model&select=value`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
        if (cfgResp.ok) {
          const rows = await cfgResp.json();
          if (rows?.[0]?.value) model = rows[0].value;
        }
      } catch { /* use default */ }
    }

    const systemContent =
      mode === "refine"
        ? `${SYSTEM_PROMPT}\n\nThe user is asking you to REFINE or IMPROVE an existing prompt. Focus on making it more effective, specific, and well-structured.`
        : mode === "analyze"
        ? `${SYSTEM_PROMPT}\n\nThe user is asking you to ANALYZE a prompt. Break down its strengths, weaknesses, and provide a scored assessment with actionable improvements.`
        : SYSTEM_PROMPT;

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
          model,
          messages: [
            { role: "system", content: systemContent },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    let response = await callOpenRouter(model);

    if (!response.ok && !useFreeModel && [402, 429, 500, 502, 503, 504].includes(response.status)) {
      const premiumErr = await response.text();
      console.error("Premium Prompt Engineer model failed, falling back to free model:", response.status, premiumErr);
      useFreeModel = true;
      model = FREE_MODELS[0];
      response = await callOpenRouter(model);
    }

    if (!response.ok && useFreeModel) {
      for (const freeModel of FREE_MODELS.slice(1)) {
        const errText = await response.text();
        console.error("Free Prompt Engineer model failed, trying next:", model, response.status, errText);
        model = freeModel;
        response = await callOpenRouter(model);
        if (response.ok) break;
      }
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Free AI capacity is temporarily unavailable. Please try again shortly." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!useFreeModel && userId && creditCost > 0) {
      await supabase.from("profiles").update({
        credit_balance: Math.max(0, paidCreditsAvailable - creditCost),
      }).eq("user_id", userId);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("prompt-engineer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
