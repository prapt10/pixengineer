import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { credits, price, currency } = await req.json();
    const cur = currency === "USD" ? "USD" : "INR";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: configs } = await serviceClient
      .from("platform_config")
      .select("key, value")
      .in("key", [
        "credits_starter", "credits_growth", "credits_pro",
        `price_${cur.toLowerCase()}_starter`,
        `price_${cur.toLowerCase()}_growth`,
        `price_${cur.toLowerCase()}_pro`,
      ]);

    const cfgMap: Record<string, string> = {};
    configs?.forEach((c: any) => { cfgMap[c.key] = c.value; });

    const curKey = cur.toLowerCase();
    const VALID_PACKAGES = [
      { credits: parseInt(cfgMap.credits_starter || "300"), price: parseInt(cfgMap[`price_${curKey}_starter`] || "0") },
      { credits: parseInt(cfgMap.credits_growth || "1200"), price: parseInt(cfgMap[`price_${curKey}_growth`] || "0") },
      { credits: parseInt(cfgMap.credits_pro || "3500"), price: parseInt(cfgMap[`price_${curKey}_pro`] || "0") },
    ];

    const validPkg = VALID_PACKAGES.find(
      (p) => p.credits === credits && p.price === price
    );
    if (!validPkg) {
      return new Response(
        JSON.stringify({ error: "Invalid package selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountSmallest = price * 100; // cents or paise
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: amountSmallest,
        currency: cur,
        receipt: `crd_${credits}_${Date.now()}`,
      }),
    });

    if (!rzpRes.ok) {
      const errText = await rzpRes.text();
      console.error("Razorpay order creation failed:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rzpOrder = await rzpRes.json();

    await serviceClient.from("payments").insert({
      user_id: userId,
      razorpay_order_id: rzpOrder.id,
      amount_inr: amountSmallest,
      credits,
      status: "created",
    });

    return new Response(
      JSON.stringify({
        orderId: rzpOrder.id,
        amount: amountSmallest,
        currency: cur,
        keyId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
