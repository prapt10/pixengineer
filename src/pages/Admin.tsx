import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Coins, Code2, TrendingUp, Shield, Settings,
  BarChart3, DollarSign, Wand2, AlertTriangle, Cpu, Wallet
} from "lucide-react";
import { supabase } from "@/lib/supabase-custom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/admin/UserManagement";
import FormatManagement from "@/components/admin/FormatManagement";
import ConfigManagement from "@/components/admin/ConfigManagement";
import PromptEngineerManagement from "@/components/admin/PromptEngineerManagement";

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      return data as {
        total_users: number;
        total_generations: number;
        total_credits_purchased: number;
        total_free_credits: number;
        users: Array<{
          user_id: string;
          free_credits: number;
          credit_balance: number;
          is_active: boolean;
          created_at: string;
          generation_count: number;
        }> | null;
      };
    },
    enabled: !!user && isAdmin,
  });

  const { data: configData } = useQuery({
    queryKey: ["platform-config-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_config").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((c: { key: string; value: string }) => { map[c.key] = c.value; });
      return map;
    },
    enabled: !!user && isAdmin,
  });

  const { data: orBalance } = useQuery({
    queryKey: ["openrouter-balance"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("openrouter-balance");
      if (error) throw error;
      return data as { balance: number | null; usage: number; remaining: number | null; limit_remaining: number | null };
    },
    enabled: !!user && isAdmin,
    refetchInterval: 60000,
  });

  if (!user) { navigate("/login"); return null; }
  if (adminLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <p className="text-muted-foreground">Checking access…</p>
      </div>
    );
  }
  if (!isAdmin) { navigate("/"); return null; }

  const creditValueInr = parseFloat(configData?.credit_value_inr ?? "2");
  const totalGenerations = stats?.total_generations ?? 0;
  const totalCreditsPurchased = stats?.total_credits_purchased ?? 0;
  const totalRevenue = totalCreditsPurchased * creditValueInr;
  const designCost = parseInt(configData?.credits_design_to_code ?? "30");
  const buildCost = parseInt(configData?.credits_build_app ?? "50");
  const totalCost = totalGenerations * designCost * creditValueInr;
  const totalProfit = totalRevenue - totalCost;
  const freeModelNote = "openrouter/auto";

  return (
    <div className="min-h-screen pt-16 pb-6 px-4 gradient-bg">
      <div className="container max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="glass flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="gap-1 text-xs px-2.5 py-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1 text-xs px-2.5 py-1.5">
                <Users className="w-3.5 h-3.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="formats" className="gap-1 text-xs px-2.5 py-1.5">
                <Code2 className="w-3.5 h-3.5" /> Formats
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-1 text-xs px-2.5 py-1.5">
                <Settings className="w-3.5 h-3.5" /> Config
              </TabsTrigger>
              <TabsTrigger value="prompt-tool" className="gap-1 text-xs px-2.5 py-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Prompts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <StatCard icon={Users} label="Total Users" value={stats?.total_users ?? 0} />
                <StatCard icon={Code2} label="Generations" value={totalGenerations} />
                <StatCard icon={Coins} label="Credits Purchased" value={totalCreditsPurchased} />
                <StatCard icon={Coins} label="Free Credits" value={stats?.total_free_credits ?? 0} />
              </div>

              {/* OpenRouter API Status */}
              <Card className="glass mb-4 border border-primary/20">
                <CardHeader className="pb-1 pt-3">
                  <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-primary" /> OpenRouter API
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <Wallet className="w-4 h-4 mx-auto mb-0.5 text-primary" />
                      <p className="text-lg font-bold">
                        {orBalance?.remaining != null ? `$${orBalance.remaining.toFixed(2)}` : orBalance?.limit_remaining != null ? `$${orBalance.limit_remaining.toFixed(2)}` : "N/A"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Remaining</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">${(orBalance?.usage ?? 0).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Usage</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold">{configData?.ai_model ?? "claude-sonnet-4.6"}</p>
                      <p className="text-[10px] text-muted-foreground">Design Model</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold">{configData?.prompt_engineer_model ?? "gpt-5.3"}</p>
                      <p className="text-[10px] text-muted-foreground">Prompt Model</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 border border-border mb-2">
                    <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">
                      Free fallback model: <span className="font-mono font-medium text-foreground">{freeModelNote}</span> (used when users have 0 credits)
                    </p>
                  </div>
                  {orBalance?.remaining != null && orBalance.remaining < 5 && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      <p className="text-[10px] text-destructive font-medium">Low balance! Top up soon.</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    <a href="https://openrouter.ai/credits" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Top up</a>
                    {" · "}
                    <a href="https://openrouter.ai/activity" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Activity</a>
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="glass">
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-xl font-bold text-green-500">₹{totalRevenue.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> API Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-xl font-bold text-destructive">₹{totalCost.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-destructive"}`}>
                      ₹{totalProfit.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <UserManagement users={stats?.users ?? []} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="formats">
              <FormatManagement />
            </TabsContent>

            <TabsContent value="config">
              <ConfigManagement />
            </TabsContent>

            <TabsContent value="prompt-tool">
              <PromptEngineerManagement />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card className="glass">
      <CardContent className="pt-4 pb-3 text-center">
        <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
