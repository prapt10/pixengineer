import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Coins, Save, Loader2, Brain } from "lucide-react";
import { supabase } from "@/lib/supabase-custom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type ConfigItem = {
  id: string;
  key: string;
  value: string;
  label: string;
  category: string;
};

export default function ConfigManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ["platform-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .order("category");
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
      queryClient.invalidateQueries({ queryKey: ["platform-config"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Config updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (key: string) => {
    if (editValues[key] !== undefined) {
      updateMutation.mutate({ key, value: editValues[key] });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const aiConfigs = configs?.filter((c) => c.category === "ai") ?? [];
  const pricingConfigs = configs?.filter((c) => c.category === "pricing") ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfigSection
        icon={Brain}
        title="AI Configuration"
        description="Configure AI provider, model, and generation settings"
        configs={aiConfigs}
        editValues={editValues}
        onEdit={setEditValues}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
      <ConfigSection
        icon={Coins}
        title="Token Pricing"
        description="Configure pricing, costs, and free trial allocations"
        configs={pricingConfigs}
        editValues={editValues}
        onEdit={setEditValues}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}

function ConfigSection({
  icon: Icon,
  title,
  description,
  configs,
  editValues,
  onEdit,
  onSave,
  isSaving,
}: {
  icon: any;
  title: string;
  description: string;
  configs: ConfigItem[];
  editValues: Record<string, string>;
  onEdit: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: (key: string) => void;
  isSaving: boolean;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" /> {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {configs.map((config) => {
          const isEditing = editValues[config.key] !== undefined;
          const currentValue = isEditing ? editValues[config.key] : config.value;

          return (
            <div key={config.key} className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-sm text-muted-foreground">{config.label}</Label>
                <Input
                  value={currentValue}
                  onChange={(e) =>
                    onEdit((prev) => ({ ...prev, [config.key]: e.target.value }))
                  }
                  className="glass font-mono text-sm"
                />
              </div>
              {isEditing && (
                <Button
                  size="sm"
                  onClick={() => onSave(config.key)}
                  disabled={isSaving}
                  className="shrink-0"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
