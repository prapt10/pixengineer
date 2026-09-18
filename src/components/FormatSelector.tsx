import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase-custom";

export type OutputFormat = string;

interface FormatOption {
  id: string;
  value: string;
  label: string;
  description: string;
}

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (format: OutputFormat) => void;
}

export default function FormatSelector({ value, onChange }: FormatSelectorProps) {
  const { data: formats = [] } = useQuery({
    queryKey: ["output-formats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("output_formats")
        .select("id, value, label, description")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as FormatOption[];
    },
  });

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {formats.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            "px-5 py-3 rounded-xl border transition-all duration-200 text-left",
            value === f.value
              ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(258_90%_62%/0.2)]"
              : "border-border hover:border-primary/40 bg-card/50"
          )}
        >
          <p className="font-medium text-sm">{f.label}</p>
          <p className="text-xs text-muted-foreground">{f.description}</p>
        </button>
      ))}
    </div>
  );
}
