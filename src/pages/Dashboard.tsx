import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Code2, Clock, Rocket, Wand2, Zap, ArrowRight, Coins, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase-custom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const { data: generations = [] } = useQuery({
    queryKey: ["generations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: appBuilds = [] } = useQuery({
    queryKey: ["app-builds", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("app_builds")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: promptHistory = [] } = useQuery({
    queryKey: ["prompt-history-dash", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("prompt_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!user) {
    navigate("/login");
    return null;
  }

  const creditBalance = profile?.credit_balance ?? 0;
  const hasPaidCredits = creditBalance > 0;

  const tools = [
    { label: "Build App", icon: Rocket, path: "/", desc: "AI-powered full app generation", color: "text-primary" },
    { label: "Design to Code", icon: Code2, path: "/design-to-code", desc: "Convert screenshots to code", color: "text-accent" },
    { label: "Prompt Engineer", icon: Wand2, path: "/prompt-engineer", desc: "Generate & refine prompts", color: "text-primary" },
    { label: "Pix Chat", icon: MessageSquare, path: "/chat", desc: "Chat with advanced AI", color: "text-accent" },
  ];

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 gradient-bg">
      <div className="container max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Welcome + Plan */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Welcome back! Here's your overview.</p>
            </div>
            <div className="flex items-center gap-2">
              {hasPaidCredits ? (
                <Badge variant="secondary" className="gap-1 py-1 px-3">
                  <Coins className="w-3 h-3" /> {creditBalance} credits
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 py-1 px-3 border-primary/30 text-primary">
                  <Zap className="w-3 h-3" /> Free Plan
                </Badge>
              )}
              <Link to="/pricing">
                <Button size="sm" variant="outline" className="text-xs h-7">
                  {hasPaidCredits ? "Buy More" : "Upgrade"}
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card key={tool.path} className="glass cursor-pointer hover:border-primary/40 transition-all group"
                  onClick={() => navigate(tool.path)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-primary/10 ${tool.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{tool.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{tool.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="glass">
              <CardContent className="pt-4 pb-3 text-center">
                <Code2 className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{generations.length}</p>
                <p className="text-[10px] text-muted-foreground">Design Conversions</p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="pt-4 pb-3 text-center">
                <Rocket className="w-5 h-5 mx-auto mb-1 text-accent" />
                <p className="text-xl font-bold">{appBuilds.length}</p>
                <p className="text-[10px] text-muted-foreground">Apps Built</p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="pt-4 pb-3 text-center">
                <Wand2 className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{promptHistory.length}</p>
                <p className="text-[10px] text-muted-foreground">Prompts</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Designs */}
            <div>
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-primary" /> Recent Designs
              </h2>
              {generations.length === 0 ? (
                <Card className="glass">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No designs yet. <Link to="/design-to-code" className="text-primary underline">Convert one now</Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {generations.slice(0, 5).map((gen: any) => (
                    <Card key={gen.id} className="glass cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => navigate("/result", { state: { html: gen.output_html, css: gen.output_css, format: gen.format } })}>
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Code2 className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xs font-medium">{gen.format.toUpperCase()}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(gen.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Recent App Builds */}
            <div>
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-accent" /> Recent Apps
              </h2>
              {appBuilds.length === 0 ? (
                <Card className="glass">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No apps yet. <Link to="/build-app" className="text-primary underline">Build one now</Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {appBuilds.slice(0, 5).map((build: any) => (
                    <Card key={build.id} className="glass cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => navigate("/build-app")}>
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Rocket className="w-4 h-4 text-accent" />
                          <div>
                            <p className="text-xs font-medium truncate max-w-[200px]">{build.title}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(build.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{build.framework}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
