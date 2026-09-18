import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, Zap, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-custom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type PkgDef = { credits: number; price: number; label: string; popular: boolean };

export default function Pricing() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { currency, symbol } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);

  const { data: configMap } = useQuery({
    queryKey: ["platform-config-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_config").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((c: { key: string; value: string }) => { map[c.key] = c.value; });
      return map;
    },
  });

  const currKey = currency.toLowerCase();
  const packages: PkgDef[] = [
    {
      credits: parseInt(configMap?.credits_starter ?? "300"),
      price: parseInt(configMap?.[`price_${currKey}_starter`] ?? (currency === "INR" ? "500" : "5")),
      label: "Starter",
      popular: false,
    },
    {
      credits: parseInt(configMap?.credits_growth ?? "1200"),
      price: parseInt(configMap?.[`price_${currKey}_growth`] ?? (currency === "INR" ? "1500" : "15")),
      label: "Growth",
      popular: true,
    },
    {
      credits: parseInt(configMap?.credits_pro ?? "3500"),
      price: parseInt(configMap?.[`price_${currKey}_pro`] ?? (currency === "INR" ? "4000" : "40")),
      label: "Pro",
      popular: false,
    },
  ];

  const totalCredits = (profile?.credit_balance ?? 0);

  const handlePurchase = async (pkg: PkgDef) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to purchase credits.", variant: "destructive" });
      return;
    }
    setLoadingPkg(pkg.label);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast({ title: "Error", description: "Failed to load payment gateway.", variant: "destructive" });
        setLoadingPkg(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { credits: pkg.credits, price: pkg.price, currency },
      });
      if (error || !data?.orderId) {
        toast({ title: "Error", description: "Failed to create order.", variant: "destructive" });
        setLoadingPkg(null);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Pix Engineer",
        description: `${pkg.credits} Credits`,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            if (verifyError || !verifyData?.success) {
              toast({ title: "Verification failed", description: "Contact support if charged.", variant: "destructive" });
            } else {
              toast({ title: "Payment successful! 🎉", description: `${pkg.credits} credits added.` });
              queryClient.invalidateQueries({ queryKey: ["profile"] });
            }
          } catch {
            toast({ title: "Error", description: "Payment verification failed.", variant: "destructive" });
          }
          setLoadingPkg(null);
        },
        modal: { ondismiss: () => setLoadingPkg(null) },
        prefill: { email: user.email },
        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
        setLoadingPkg(null);
      });
      rzp.open();
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      setLoadingPkg(null);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Pricing — Pix Engineer",
    description: "Purchase credits to unlock premium AI models for app building, design-to-code conversion, and prompt engineering on Pix Engineer.",
    url: "https://pixengineer.com/pricing",
    mainEntity: {
      "@type": "Product",
      name: "Pix Engineer Credits",
      description: "AI credits for building apps, converting designs, and engineering prompts.",
      offers: packages.map((pkg) => ({
        "@type": "Offer",
        name: `${pkg.label} — ${pkg.credits} credits`,
        price: pkg.price,
        priceCurrency: currency,
      })),
    },
  };

  return (
    <div className="min-h-screen pt-16 pb-10 px-4 gradient-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Get More Credits</h1>
          <p className="text-sm text-muted-foreground">Power your AI workflows with credits</p>
          {user && totalCredits > 0 && (
            <p className="text-xs mt-1.5">
              Balance: <span className="font-semibold text-primary">{totalCredits} credits</span>
            </p>
          )}
          {user && totalCredits === 0 && (
            <p className="text-xs mt-1.5">
              Plan: <span className="font-semibold text-primary">Free</span> — upgrade for premium AI
            </p>
          )}
        </motion.div>

        {/* Free plan + upgrade notice */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="mb-6 space-y-3">
          <Card className="glass border-primary/20">
            <CardContent className="py-3 px-4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <p className="text-xs font-medium">Free Plan: <span className="text-primary">Unlimited usage</span> with auto-selected models</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3 px-4 flex items-start gap-3">
              <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Upgrade for Premium Quality</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Free plan uses basic auto-routed models. Purchase credits to unlock <span className="font-medium text-foreground">premium AI models</span> for faster, more accurate, and higher-quality results.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground">
            <span className="px-2.5 py-1 rounded-full glass">App Build: 50cr</span>
            <span className="px-2.5 py-1 rounded-full glass">Design to Code: 30cr</span>
            <span className="px-2.5 py-1 rounded-full glass">Pix Chat: 2cr/msg</span>
            <span className="px-2.5 py-1 rounded-full glass">Generate: 6cr</span>
            <span className="px-2.5 py-1 rounded-full glass">Improve: 5cr</span>
            <span className="px-2.5 py-1 rounded-full glass">Analyzer: 4cr</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {packages.map((pkg, i) => {
            const isLoading = loadingPkg === pkg.label;
            return (
              <motion.div key={pkg.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.1 }}>
                <Card className={`glass relative overflow-hidden transition-all hover:scale-[1.03] ${pkg.popular ? "border-primary shadow-lg shadow-primary/20" : ""}`}>
                  {pkg.popular && (
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-medium rounded-bl-lg">
                      Popular
                    </div>
                  )}
                  <CardHeader className="text-center pb-1 pt-4">
                    <CardTitle className="text-base">{pkg.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-3 pb-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <Coins className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold">{pkg.credits}</span>
                    </div>
                    <p className="text-xl font-bold">{symbol}{pkg.price}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {symbol}{(pkg.price / pkg.credits).toFixed(3)} / credit
                    </p>
                    <Button onClick={() => handlePurchase(pkg)} disabled={!!loadingPkg} size="sm" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                      {isLoading ? "Processing..." : "Buy Now"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
