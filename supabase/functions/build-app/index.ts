import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function resetFreeCreditsIfNeeded(supabase: any, userId: string, profile: any) {
  const resetAt = new Date(profile.free_credits_reset_at);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (resetAt < todayStart) {
    await supabase.from("profiles").update({
      free_credits: 20,
      free_credits_reset_at: now.toISOString(),
    }).eq("user_id", userId);
    return { ...profile, free_credits: 20 };
  }
  return profile;
}

function extractDelimitedPayload(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();

  if (normalized.includes("---FILE:")) return normalized;

  const fencedMatch = normalized.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
  if (fencedMatch?.[1]?.includes("---FILE:")) return fencedMatch[1].trim();

  return normalized;
}

function parseFiles(content: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const payload = extractDelimitedPayload(content);
  const regex = /---FILE:\s*(.+?)---\s*\n([\s\S]*?)(?=\n---FILE:|\n---END---|$)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(payload)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2].replace(/\n$/, "");
    if (filePath) {
      files.push({ path: filePath, content: fileContent });
    }
  }

  return files;
}

function getSystemPrompt(framework: string): string {
  const frameworkInstructions: Record<string, string> = {
    nextjs: `You are an expert Next.js developer. Generate a complete Next.js 14+ App Router project.
Always include: package.json (with next, react, react-dom, typescript, tailwindcss, @types/react, @types/node),
tsconfig.json, tailwind.config.ts, postcss.config.js, src/app/layout.tsx, src/app/page.tsx, src/app/globals.css.
Use TypeScript, Tailwind CSS, and modern React patterns. Make it responsive and visually polished.`,

    react: `You are an expert React developer. Generate a complete React + Vite + TypeScript project.
Always include: package.json (with react, react-dom, vite, @vitejs/plugin-react, typescript, tailwindcss),
vite.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.js, index.html, src/main.tsx, src/App.tsx, src/index.css.
Use TypeScript, Tailwind CSS, and modern React patterns. Make it responsive and visually polished.`,

    html: `You are an expert frontend developer. Generate a complete static HTML/CSS/JS project.
Always include: index.html, styles.css, and optionally script.js.
Use modern CSS, semantic HTML5, and vanilla JavaScript. Make it responsive and visually polished.`,
  };

  const base = frameworkInstructions[framework] || frameworkInstructions.nextjs;

  return `${base}

Additionally, include a lightweight static preview for the in-app renderer:
- preview/index.html
- preview/styles.css
This preview should visually reflect the generated app.

CRITICAL FORMAT INSTRUCTIONS:
You MUST return ALL files using this exact delimited format:

---FILE: path/to/file.ext---
(file content here)
---FILE: another/file.ext---
(file content here)
---END---

Rules:
- Every file must start with ---FILE: filepath--- on its own line
- End the entire response with ---END--- on its own line
- Do NOT include any text outside the file blocks (no explanations, no markdown code fences)
- Generate complete, working files with no placeholders
- Include ALL necessary config files for the project to run
- Use clean, production-quality code`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid token");

    // Get profile & reset free credits
    const { data: rawProfile, error: profileError } = await supabase
      .from("profiles")
      .select("free_credits, credit_balance, is_active, free_credits_reset_at")
      .eq("user_id", user.id)
      .single();
    if (profileError || !rawProfile) throw new Error("Profile not found");
    if (!rawProfile.is_active) {
      return new Response(JSON.stringify({ error: "Account deactivated." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = await resetFreeCreditsIfNeeded(supabase, user.id, rawProfile);

    // Get credit cost
    const { data: costConfig } = await supabase
      .from("platform_config").select("value").eq("key", "credits_build_app").single();
    const creditCost = parseInt(costConfig?.value ?? "50");

    const totalCredits = profile.free_credits + profile.credit_balance;
    const usedFreeModel = totalCredits < creditCost;

    const { messages, framework = "nextjs", existingFiles = [] } = await req.json();
    if (!messages || messages.length === 0) throw new Error("No messages provided");

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const systemPrompt = getSystemPrompt(framework);

    // Build context about existing files if iterating
    let contextMessage = "";
    if (existingFiles.length > 0) {
      contextMessage = "\n\nCurrent project files:\n" + existingFiles.map(
        (f: { path: string; content: string }) => `---FILE: ${f.path}---\n${f.content}`
      ).join("\n") + "\n---END---\n\nThe user wants to modify this project. Return ALL files (modified and unmodified) in the same format.";
    }

    const aiMessages = [
      { role: "system", content: systemPrompt + contextMessage },
      ...messages,
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pixengineer.com",
        "X-Title": "Pix Engineer",
      },
      body: JSON.stringify({
        model: usedFreeModel ? "openrouter/auto" : "anthropic/claude-opus-4.6",
        max_tokens: 16384,
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const files = parseFiles(content);

    if (files.length === 0) {
      console.error("build-app parse error: model returned no parseable files", content);
      return new Response(JSON.stringify({ error: "Could not parse generated files. Please retry your prompt." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits only if using premium model
    let freeLeft = profile.free_credits;
    let paidLeft = profile.credit_balance;
    if (!usedFreeModel) {
      let remaining = creditCost;
      if (freeLeft >= remaining) {
        freeLeft -= remaining;
      } else {
        remaining -= freeLeft;
        freeLeft = 0;
        paidLeft -= remaining;
      }

      await supabase.from("profiles").update({
        free_credits: freeLeft,
        credit_balance: paidLeft,
      }).eq("user_id", user.id);
    }

    // Generate title from first message
    const firstUserMsg = messages.find((m: any) => m.role === "user");
    const title = firstUserMsg?.content?.substring(0, 80) || "Untitled App";

    const hasPreview = files.some((f: { path: string }) => f.path === "preview/index.html");
    const cleanMessage = `✅ Project generated successfully!\n\n**Framework:** ${framework}\n**Files created:** ${files.length}\n${hasPreview ? "**Live preview:** ready" : "**Live preview:** limited for this generation"}\n\n${files.map((f: { path: string }) => `• \`${f.path}\``).join("\n")}\n\nYou can browse files and preview on the right, then ask for edits in chat.`;

    return new Response(JSON.stringify({
      files,
      assistantMessage: cleanMessage,
      title,
      creditsUsed: usedFreeModel ? 0 : creditCost,
      creditsRemaining: freeLeft + paidLeft,
      usedFreeModel,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("build-app error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
