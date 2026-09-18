import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/xml",
  "Access-Control-Allow-Origin": "*",
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const baseUrl = "https://pixengineer.com";

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/pricing", priority: "0.8", changefreq: "monthly" },
    { loc: "/contact", priority: "0.6", changefreq: "monthly" },
    { loc: "/blog", priority: "0.9", changefreq: "daily" },
    { loc: "/terms", priority: "0.3", changefreq: "yearly" },
    { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
    { loc: "/refund-policy", priority: "0.3", changefreq: "yearly" },
    { loc: "/prompt-engineer", priority: "0.8", changefreq: "weekly" },
  ];

  const { data: blogs } = await supabase
    .from("blogs")
    .select("slug, updated_at, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const staticEntries = staticPages.map(
    (p) => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  );

  const blogEntries = (blogs || []).map(
    (b) => `  <url>
    <loc>${baseUrl}/blog/${b.slug}</loc>
    <lastmod>${(b.updated_at || b.published_at || "").split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries.join("\n")}
${blogEntries.join("\n")}
</urlset>`;

  return new Response(xml, { headers: corsHeaders });
});
