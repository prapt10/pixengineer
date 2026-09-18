import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    return { ...profile, free_credits: 20, free_credits_reset_at: now.toISOString() };
  }
  return profile;
}

type GeneratedFile = { path: string; content: string };

function getExpectedFiles(format: string): string[] {
  const map: Record<string, string[]> = {
    "html-css": ["index.html", "styles.css"],
    "html-scss": ["index.html", "styles.scss"],
    "html-tailwind": ["index.html", "tailwind.config.js", "styles.css"],
    "react-scss": ["src/components/GeneratedComponent.tsx", "src/components/GeneratedComponent.module.scss"],
    "react-tailwind": ["src/components/GeneratedComponent.tsx", "tailwind.config.js"],
    "angular-scss": ["src/app/generated/generated.component.ts", "src/app/generated/generated.component.html", "src/app/generated/generated.component.scss"],
    "angular-tailwind": ["src/app/generated/generated.component.ts", "src/app/generated/generated.component.html", "tailwind.config.js"],
    "nextjs-scss": ["src/app/page.tsx", "src/app/page.module.scss", "src/app/globals.css"],
    "nextjs-tailwind": ["src/app/page.tsx", "tailwind.config.ts", "src/app/globals.css"],
  };

  return map[format] || ["index.html", "styles.css"];
}

function parseGeneratedFiles(content: string): GeneratedFile[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const regex = /---FILE:\s*(.+?)---\s*\n([\s\S]*?)(?=\n---FILE:|\n---END---|$)/g;
  const files: GeneratedFile[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const path = match[1].trim();
    const fileContent = match[2].replace(/\n$/, "");
    if (path) files.push({ path, content: fileContent });
  }

  return files;
}

function getPrimaryOutputs(format: string, files: GeneratedFile[], fallbackHtml = "", fallbackCss = "") {
  const htmlLike = files.find((f) => f.path.endsWith("index.html") || f.path.endsWith(".html") || f.path.endsWith(".tsx"));
  const cssLike = files.find((f) => f.path.endsWith(".scss") || f.path.endsWith(".css"));

  if (format.startsWith("html")) {
    return {
      html: files.find((f) => f.path.endsWith("index.html"))?.content || fallbackHtml,
      css: cssLike?.content || fallbackCss,
    };
  }

  return {
    html: htmlLike?.content || fallbackHtml,
    css: cssLike?.content || fallbackCss,
  };
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

    const { data: rawProfile, error: profileError } = await supabase
      .from("profiles")
      .select("free_credits, credit_balance, is_active, free_credits_reset_at")
      .eq("user_id", user.id)
      .single();

    if (profileError || !rawProfile) throw new Error("Profile not found");
    if (!rawProfile.is_active) {
      return new Response(JSON.stringify({ error: "Your account has been deactivated. Contact support." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset free credits if needed
    const profile = await resetFreeCreditsIfNeeded(supabase, user.id, rawProfile);

    // Fetch credit cost from config
    const { data: costConfig } = await supabase
      .from("platform_config").select("key, value").eq("key", "credits_design_to_code").single();
    const creditCost = parseInt(costConfig?.value ?? "30");

    const totalCredits = profile.free_credits + profile.credit_balance;

    const { imageUrl, format = "html-css", forceFreeModel = false } = await req.json();
    if (!imageUrl) throw new Error("No image URL provided");

    const usedFreeModel = forceFreeModel || totalCredits < creditCost;

    const { data: formatData } = await supabase
      .from("output_formats").select("prompt").eq("value", format).eq("is_active", true).single();
    const formatPrompt = formatData?.prompt || "Generate clean, semantic, responsive HTML and vanilla CSS code that matches this design pixel-perfectly. Return the HTML in one block and the CSS in another block.";

    const { data: configRows } = await supabase
      .from("platform_config").select("key, value").in("key", ["ai_model", "ai_max_tokens"]);
    const config: Record<string, string> = {};
    configRows?.forEach((r: { key: string; value: string }) => { config[r.key] = r.value; });

    const aiModel = usedFreeModel ? "openrouter/auto" : (config.ai_model || "anthropic/claude-sonnet-4.6");
    const aiMaxTokens = parseInt(config.ai_max_tokens || "8192", 10);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const expectedFiles = getExpectedFiles(format);
    const isScss = format.includes("scss");
    const isTailwind = format.includes("tailwind");

    const systemPrompt = `You are an expert frontend developer. ${formatPrompt}

${isScss ? "IMPORTANT: Use real SCSS syntax with variables ($color-primary, $spacing-md, etc.), nesting, mixins, and partials where useful. Generate complete SCSS files with proper SCSS syntax, NOT plain CSS." : ""}
${isTailwind ? "IMPORTANT: Use Tailwind CSS utility classes directly in the HTML markup. Also generate a tailwind.config.js with any custom theme extensions. Generate a styles.css with @tailwind base/components/utilities directives." : ""}

CRITICAL: Return ONLY files in this exact format (no markdown fences, no explanations):
---FILE: path/to/file.ext---
(file content)
---FILE: another/file.ext---
(file content)
---END---

You MUST include these files for this format:
${expectedFiles.map((path) => `- ${path}`).join("\n")}

Also include preview files for in-app rendering:
- preview/index.html (MUST be a complete standalone HTML document. ${isTailwind ? "Include <script src='https://cdn.tailwindcss.com'></script> in <head>." : "Embed ALL styles in a <style> tag."} This must render the full design perfectly on its own.)
- preview/styles.css (any additional styles needed for preview)`;

    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error("Failed to fetch uploaded image");
    const imgBuffer = new Uint8Array(await imgResponse.arrayBuffer());
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < imgBuffer.length; i += chunkSize) {
      binary += String.fromCharCode(...imgBuffer.subarray(i, i + chunkSize));
    }
    const base64Image = btoa(binary);
    const contentType = imgResponse.headers.get("content-type") || "image/png";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pixengineer.com",
        "X-Title": "Pix Engineer",
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: aiMaxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${contentType};base64,${base64Image}` } },
              { type: "text", text: "Convert this design into code. Match the layout, colors, typography, and spacing as closely as possible." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({
          error: "Premium AI credits are exhausted. You can continue with Free Mode.",
          code: "credits_exhausted",
          canUseFreeModel: true,
        }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    const files = parseGeneratedFiles(content);

    const legacyHtmlMatch = content.match(/---HTML---\s*([\s\S]*?)\s*---CSS---/);
    const legacyCssMatch = content.match(/---CSS---\s*([\s\S]*?)\s*---END---/);
    const legacyHtml = legacyHtmlMatch?.[1]?.trim() || "";
    const legacyCss = legacyCssMatch?.[1]?.trim() || "";

    const { html, css } = getPrimaryOutputs(format, files, legacyHtml, legacyCss);

    // Deduct credits only if using premium model
    if (!usedFreeModel) {
      let freeLeft = profile.free_credits;
      let paidLeft = profile.credit_balance;
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

    await supabase.from("generations").insert({
      user_id: user.id,
      input_image_url: imageUrl,
      output_html: html,
      output_css: css,
      format,
    });

    return new Response(JSON.stringify({
      html,
      css,
      files,
      usedFreeModel,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
