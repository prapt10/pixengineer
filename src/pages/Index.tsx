import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase-custom";
import UploadZone from "@/components/UploadZone";
import FormatSelector, { type OutputFormat } from "@/components/FormatSelector";
import FreePlanModal from "@/components/FreePlanModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FeatureHistorySidebar, { type HistoryItem } from "@/components/FeatureHistorySidebar";
import { setPageMeta } from "@/lib/seo";

const Index = () => {
  useEffect(() => {
    setPageMeta({
      title: "Design to Code — Pix Engineer",
      description: "Upload any design, wireframe, or sketch and get pixel-perfect, responsive HTML, React, or Tailwind code instantly.",
      path: "/design-to-code",
    });
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<OutputFormat>("html-css");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* ── History queries ── */
  const { data: generations = [], isLoading: genLoading } = useQuery({
    queryKey: ["generations-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("generations")
        .select("id, format, created_at, output_html, output_css")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteGenMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations-history"] });
      toast({ title: "Generation deleted" });
    },
  });

  const historyItems: HistoryItem[] = generations.map((g: any) => ({
    id: g.id,
    title: `${g.format} conversion`,
    subtitle: g.format,
    updatedAt: g.created_at,
  }));

  const loadGeneration = (id: string) => {
    const gen = generations.find((g: any) => g.id === id);
    if (!gen) return;
    navigate("/result", {
      state: {
        html: gen.output_html || "",
        css: gen.output_css || "",
        files: [],
        format: gen.format,
        usedFreeModel: false,
      },
    });
  };

  const runGeneration = async (
    imageUrl: string,
    filePath: string,
    opts: { forceFreeModel?: boolean } = {}
  ) => {
    const { data, error } = await supabase.functions.invoke("generate-code", {
      body: { imageUrl, format, forceFreeModel: opts.forceFreeModel ?? false },
    });

    if (error) {
      // Try to read structured error body from the underlying Response
      let body: any = null;
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        try { body = await ctx.clone().json(); } catch { /* noop */ }
      }
      if (body?.code === "credits_exhausted" || ctx?.status === 402) {
        setPendingImageUrl(imageUrl);
        setPendingFilePath(filePath);
        setShowFreeModal(true);
        return;
      }
      throw new Error(body?.error || error.message || "Generation failed");
    }

    if (data?.usedFreeModel) {
      toast({ title: "Free mode used", description: "Generated with the free model. Upgrade for premium quality." });
    }

    navigate("/result", {
      state: {
        html: data.html,
        css: data.css,
        files: data.files || [],
        format,
        imageUrl: filePath,
        usedFreeModel: data.usedFreeModel || false,
      },
    });
  };

  const handleGenerate = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!file) {
      toast({ title: "No image selected", description: "Please upload a design first.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage.from("uploads").createSignedUrl(filePath, 3600);
      const imageUrl = urlData?.signedUrl;
      if (!imageUrl) throw new Error("Failed to prepare image upload");

      await runGeneration(imageUrl, filePath);
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinueFree = async () => {
    if (!pendingImageUrl || !pendingFilePath) {
      setShowFreeModal(false);
      return;
    }
    setIsGenerating(true);
    try {
      await runGeneration(pendingImageUrl, pendingFilePath, { forceFreeModel: true });
      setShowFreeModal(false);
      setPendingImageUrl(null);
      setPendingFilePath(null);
    } catch (err: any) {
      toast({
        title: "Free mode failed",
        description: err.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 gradient-bg flex">
      {/* History Sidebar */}
      <FeatureHistorySidebar
        items={historyItems}
        isLoading={genLoading}
        onSelect={loadGeneration}
        onDelete={(id) => deleteGenMutation.mutate(id)}
        onNewItem={() => { setFile(null); setFormat("html-css"); }}
        label="Code History"
        newLabel="New Conversion"
      />

      {/* Main Content */}
      <div className="flex-1">
        <div className="container px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Pixel Perfect Code
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Drop a design,{" "}
              <span className="gradient-text">ship the code</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Sketch it, screenshot it, drag it in — Pix Engineer turns any visual into clean, responsive code before your coffee gets cold.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <UploadZone onFileSelect={setFile} selectedFile={file} onClear={() => setFile(null)} />

            <FormatSelector value={format} onChange={setFormat} />

            <div className="text-center">
              <Button
                size="lg"
                disabled={!file || isGenerating}
                onClick={handleGenerate}
                className="px-10 py-6 text-base font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 rounded-xl shadow-lg shadow-primary/25"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5 animate-pulse" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    Generate Code
                  </span>
                )}
              </Button>
              {!user && (
                <p className="text-sm text-muted-foreground mt-3">
                  Sign in to start generating — free plan available
                </p>
              )}
            </div>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4 mt-16"
          >
            {[
              "Pixel-perfect output",
              "Responsive by default",
              "Clean semantic HTML",
              "Multiple formats",
            ].map((feat) => (
              <span
                key={feat}
                className="px-4 py-2 rounded-full text-sm glass text-muted-foreground"
              >
                {feat}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      <FreePlanModal
        open={showFreeModal}
        onOpenChange={(o) => {
          setShowFreeModal(o);
          if (!o) {
            setPendingImageUrl(null);
            setPendingFilePath(null);
          }
        }}
        onContinueFree={handleContinueFree}
        isRetrying={isGenerating}
        featureName="Design to Code"
      />
    </div>
  );
};

export default Index;
