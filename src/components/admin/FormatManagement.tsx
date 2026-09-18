import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-custom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Code2 } from "lucide-react";

interface FormatRow {
  id: string;
  value: string;
  label: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

export default function FormatManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: formats = [], isLoading } = useQuery({
    queryKey: ["admin-formats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("output_formats")
        .select("id, value, label, description, is_active, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as FormatRow[];
    },
  });

  const toggleFormat = async (id: string, currentActive: boolean) => {
    setToggling(id);
    const { error } = await supabase
      .from("output_formats")
      .update({ is_active: !currentActive })
      .eq("id", id);
    setToggling(null);
    if (error) {
      toast({ title: "Failed to update format", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-formats"] });
      queryClient.invalidateQueries({ queryKey: ["output-formats"] });
    }
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Code2 className="w-5 h-5" /> Output Formats
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Format</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Order</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formats.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.description}</TableCell>
                  <TableCell className="text-center">{f.sort_order}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={f.is_active ? "default" : "secondary"}>
                      {f.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={f.is_active}
                      disabled={toggling === f.id}
                      onCheckedChange={() => toggleFormat(f.id, f.is_active)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
