import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wand2, Save, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase-custom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type ConfigItem = { id: string; key: string; value: string; label: string; category: string };

export default function PromptEngineerManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ["prompt-engineer-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .in("key", ["prompt_engineer_model", "prompt_engineer_enabled", "prompt_engineer_max_messages", "credits_prompt_generate", "credits_prompt_improve", "credits_prompt_analyze"]);
      if (error) throw error;
      return data as ConfigItem[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("platform_config")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-engineer-config"] });
      toast({ title: "Setting updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (key: string) => {
    if (editValues[key] !== undefined) {
      updateMutation.mutate({ key, value: editValues[key] });
      setEditValues((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  const toggleEnabled = () => {
    const current = configs?.find((c) => c.key === "prompt_engineer_enabled");
    const newValue = current?.value === "true" ? "false" : "true";
    updateMutation.mutate({ key: "prompt_engineer_enabled", value: newValue });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEnabled = configs?.find((c) => c.key === "prompt_engineer_enabled")?.value === "true";
  const editableConfigs = configs?.filter((c) => c.key !== "prompt_engineer_enabled") ?? [];

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" /> Prompt Engineer Tool
          </CardTitle>
          <p className="text-sm text-muted-foreground">Manage the Prompt Engineer tool settings and availability</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
            <div>
              <p className="text-sm font-medium">Tool Status</p>
              <p className="text-xs text-muted-foreground">{isEnabled ? "Active and available to all users" : "Disabled — hidden from users"}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleEnabled} disabled={updateMutation.isPending} className="gap-2">
              {isEnabled ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
              {isEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {/* Config fields */}
          {editableConfigs.map((config) => {
            const isEditing = editValues[config.key] !== undefined;
            const currentValue = isEditing ? editValues[config.key] : config.value;
            return (
              <div key={config.key} className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm text-muted-foreground">{config.label}</Label>
                  <Input
                    value={currentValue}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [config.key]: e.target.value }))}
                    className="glass font-mono text-sm"
                  />
                </div>
                {isEditing && (
                  <Button size="sm" onClick={() => handleSave(config.key)} disabled={updateMutation.isPending} className="shrink-0">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
