import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, Clock, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase-custom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string };

interface HistoryEntry {
  id: string;
  title: string;
  mode: string;
  category: string | null;
  messages: Msg[];
  created_at: string;
  updated_at: string;
}

interface PromptHistoryProps {
  open: boolean;
  onClose: () => void;
  onLoad: (entry: HistoryEntry) => void;
  onNewChat: () => void;
}

export default function PromptHistory({ open, onClose, onLoad, onNewChat }: PromptHistoryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["prompt-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("prompt_history")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as HistoryEntry[]) ?? [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prompt_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-history"] });
      toast({ title: "Conversation deleted" });
    },
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -320, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed left-0 top-16 bottom-0 w-80 z-40 glass border-r border-border/50 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <History className="w-4 h-4 text-primary" />
            Prompt History
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNewChat}>
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 theme-scrollbar">
          <div className="p-2 space-y-1">
            {!user && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Sign in to save your prompt history.
              </p>
            )}
            {isLoading && (
              <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
            )}
            {user && !isLoading && history.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No saved conversations yet.
              </p>
            )}
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onLoad(entry)}
                className="w-full text-left p-3 rounded-xl hover:bg-primary/5 transition-colors group flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}
                    <span className="capitalize">• {entry.mode}</span>
                  </div>
                </div>
                <Trash2
                  className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(entry.id);
                  }}
                />
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
              </button>
            ))}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}

export type { HistoryEntry, Msg };
