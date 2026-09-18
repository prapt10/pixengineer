import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-custom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function ChatSidebar({
  activeId, onSelect, onClose,
}: {
  activeId?: string;
  onSelect?: (id: string) => void;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["chat-threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createThread = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("chat_threads")
        .insert({ user_id: user.id, title: "New chat" })
        .select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] });
      navigate(`/chat/${id}`);
      onSelect?.(id);
      onClose?.();
    },
    onError: (e: any) => toast({ title: "Could not create chat", description: e.message, variant: "destructive" }),
  });

  const deleteThread = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_threads").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] });
      if (activeId === id) navigate("/chat");
    },
  });

  return (
    <aside className="w-full h-full flex flex-col bg-card/40 border-r border-border">
      <div className="p-3 border-b border-border">
        <Button
          onClick={() => createThread.mutate()}
          disabled={createThread.isPending}
          className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="text-xs text-muted-foreground p-3">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="text-center p-6 text-sm text-muted-foreground">
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No conversations yet
          </div>
        ) : (
          threads.map((t) => (
            <Link
              key={t.id}
              to={`/chat/${t.id}`}
              onClick={() => { onSelect?.(t.id); onClose?.(); }}
              className={cn(
                "group flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all",
                activeId === t.id
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-medium">{t.title || "New chat"}</div>
                <div className="text-[10px] opacity-60">
                  {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                </div>
              </div>
              <Button
                size="icon" variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition"
                aria-label="Delete chat"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm("Delete this conversation?")) deleteThread.mutate(t.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
