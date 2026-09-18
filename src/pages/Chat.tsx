import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-custom";
import { useAuth } from "@/hooks/useAuth";
import { setPageMeta } from "@/lib/seo";
import { Sparkles, Lightbulb, Code2, Languages, BookOpen, PenLine, Briefcase } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import ChatMessage, { type ChatMessageItem } from "@/components/chat/ChatMessage";
import ChatComposer, { type ComposerSubmit } from "@/components/chat/ChatComposer";
import { streamChat, type ChatMessageInput } from "@/lib/chat-api";
import FreePlanModal from "@/components/FreePlanModal";
import FeatureHistorySidebar, { type HistoryItem } from "@/components/FeatureHistorySidebar";


const SUGGESTIONS = [
  { icon: Lightbulb, title: "Explain a topic", prompt: "Explain quantum entanglement to me like I'm a curious 12-year-old, with everyday analogies." },
  { icon: Code2, title: "Write code", prompt: "Write a TypeScript function that debounces an async call and cancels in-flight requests when called again." },
  { icon: PenLine, title: "Help me write", prompt: "Help me write a friendly but professional email asking my manager for a one-on-one to discuss career growth." },
  { icon: BookOpen, title: "Summarize", prompt: "Summarize the key ideas of 'Atomic Habits' in 6 bullet points with a practical example for each." },
  { icon: Languages, title: "Translate", prompt: "Translate this to natural, conversational Spanish: 'Could you let me know when the package is delivered? Thanks!'" },
  { icon: Briefcase, title: "Plan a project", prompt: "Create a 4-week launch plan for a small SaaS landing page, including key milestones and channels." },
];

export default function Chat() {
  const { threadId } = useParams<{ threadId?: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [liveMessages, setLiveMessages] = useState<ChatMessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const pendingResubmitRef = useRef<ComposerSubmit | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setPageMeta({
      title: "Pix Chat — AI Assistant for Everyday Tasks | Pix Engineer",
      description: "Chat with an advanced AI assistant to explore ideas, solve problems, write code, and learn faster. Free to start.",
      path: threadId ? `/chat/${threadId}` : "/chat",
    });
  }, [threadId]);

  // Ephemeral thread id for anonymous users (no DB persistence)
  const anonThreadIdRef = useRef<string>(
    (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `anon-${Date.now()}`,
  );
  const effectiveThreadId = threadId ?? (user ? undefined : anonThreadIdRef.current);

  // Fetch persisted messages for thread (authenticated only)
  const { data: persistedMessages = [] } = useQuery({
    queryKey: ["chat-messages", threadId],
    enabled: !!threadId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, attachments, created_at")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Fetch threads for history sidebar
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
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

  const historyItems: HistoryItem[] = (threads as any[]).map((t) => ({
    id: t.id,
    title: t.title || "New chat",
    updatedAt: t.updated_at,
  }));

  const handleDeleteThread = async (id: string) => {
    const { error } = await supabase.from("chat_threads").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] });
    if (threadId === id) navigate("/chat");
  };


  // Reset live state when switching between existing threads.
  // Skip when transitioning from undefined -> new id (we just created the thread mid-send).
  const prevThreadIdRef = useRef<string | undefined>(threadId);
  useEffect(() => {
    const prev = prevThreadIdRef.current;
    prevThreadIdRef.current = threadId;
    if (prev === threadId) return;
    if (prev === undefined && threadId) return; // newly-created thread during send
    setLiveMessages([]);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setIsStreaming(false);
  }, [threadId]);

  // Combine persisted + live (live appended after persisted of current thread)
  const allMessages: ChatMessageItem[] = [
    ...persistedMessages.map((m) => ({
      id: m.id, role: m.role, content: m.content, attachments: m.attachments,
    })),
    ...liveMessages,
  ];

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [allMessages.length, liveMessages]);

  const startStream = useCallback(async (
    targetThreadId: string,
    historyForApi: ChatMessageInput[],
    submit: ComposerSubmit,
    forceFreeModel = false,
  ) => {
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    setLiveMessages((prev) => {
      // Ensure assistant placeholder exists
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.pending) return prev;
      return [...prev, { role: "assistant", content: "", pending: true }];
    });

    const result = await streamChat({
      threadId: targetThreadId,
      messages: historyForApi,
      useWebSearch: submit.useWebSearch,
      forceFreeModel,
      signal: controller.signal,
      onDelta: (delta) => {
        setLiveMessages((prev) => {
          const next = [...prev];
          const idx = next.length - 1;
          if (next[idx]?.role === "assistant") {
            next[idx] = { ...next[idx], content: (next[idx].content || "") + delta, pending: true };
          }
          return next;
        });
      },
    });

    setIsStreaming(false);
    abortRef.current = null;

    if (result.ok !== true) {
      if (result.code === "credits_exhausted") {
        setLiveMessages((prev) => prev.filter((m) => !(m.role === "assistant" && m.pending && !m.content)));
        pendingResubmitRef.current = submit;
        setShowFreeModal(true);
        return;
      }
      const errMsg = result.error;
      setLiveMessages((prev) => {
        const next = [...prev];
        const idx = next.length - 1;
        if (next[idx]?.role === "assistant" && next[idx].pending) {
          next[idx] = { role: "assistant", content: `_Error: ${errMsg}_`, pending: false };
        }
        return next;
      });
      toast({ title: "Chat error", description: errMsg, variant: "destructive" });
      return;
    }

    // Finalize: mark not pending
    setLiveMessages((prev) => prev.map((m) => ({ ...m, pending: false })));
    if (user) {
      // Refetch persisted messages first, then clear live so there's no blink
      try {
        await qc.refetchQueries({ queryKey: ["chat-messages", targetThreadId], exact: true });
      } catch {}
      qc.invalidateQueries({ queryKey: ["chat-threads", user.id] });
      setLiveMessages([]);
    }
    // Anonymous: keep liveMessages so conversation stays visible (no DB)
  }, [qc, user, toast]);

  const handleSubmit = useCallback(async (submit: ComposerSubmit, forceFreeModel = false) => {
    let activeThreadId = threadId;

    if (user) {
      // Create a new thread if none (authenticated only)
      if (!activeThreadId) {
        const { data, error } = await supabase
          .from("chat_threads")
          .insert({ user_id: user.id, title: "New chat" })
          .select("id").single();
        if (error || !data) {
          toast({ title: "Could not create chat", description: error?.message ?? "", variant: "destructive" });
          return;
        }
        activeThreadId = data.id;
        qc.invalidateQueries({ queryKey: ["chat-threads", user.id] });
        navigate(`/chat/${activeThreadId}`, { replace: true });
      }
    } else {
      // Anonymous: use ephemeral in-memory thread id
      activeThreadId = anonThreadIdRef.current;
    }

    // Build content parts
    const contentParts: any[] = [];
    if (submit.text) contentParts.push({ type: "text", text: submit.text });
    for (const url of submit.images) contentParts.push({ type: "image_url", image_url: { url } });
    const userContent = submit.images.length > 0 ? contentParts : submit.text;

    // Build API history from persisted + live + new user message
    const history: ChatMessageInput[] = [
      ...persistedMessages.map((m: any) => ({ role: m.role, content: m.content })),
      ...(user ? [] : liveMessages.filter((m) => !m.pending).map((m) => ({
        role: m.role as "user" | "assistant", content: m.content,
      }))),
    ];
    history.push({ role: "user", content: userContent as any });

    // Optimistically add user message to live
    setLiveMessages((prev) => [
      ...prev,
      {
        role: "user", content: submit.text,
        attachments: submit.images.map((url) => ({ type: "image", url })),
      },
    ]);

    await startStream(activeThreadId!, history, submit, forceFreeModel);
  }, [user, threadId, persistedMessages, liveMessages, qc, navigate, toast, startStream]);

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setLiveMessages((prev) => prev.map((m) => ({ ...m, pending: false })));
  };

  const handleContinueFree = () => {
    setShowFreeModal(false);
    const submit = pendingResubmitRef.current;
    pendingResubmitRef.current = null;
    if (submit) handleSubmit(submit, true);
  };

  const empty = allMessages.length === 0;

  if (loading) {
    return <div className="min-h-screen pt-14 flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="fixed inset-0 pt-14 flex bg-background">
      {user && (
        <FeatureHistorySidebar
          items={historyItems}
          isLoading={threadsLoading}
          onSelect={(id) => navigate(`/chat/${id}`)}
          onDelete={handleDeleteThread}
          onNewItem={() => navigate("/chat")}
          label="Chat History"
          newLabel="New Chat"
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-3 py-2 flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur pl-12">
          <span className="text-sm font-medium truncate">Pix Chat</span>
          {!user && (
            <Link to="/login?redirect=/chat" className="text-xs text-primary underline whitespace-nowrap flex-shrink-0">Sign in to save</Link>
          )}
        </div>



        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {empty ? (
            <div className="max-w-2xl mx-auto px-4 pt-16 pb-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center mb-4 shadow-lg"
              >
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">How can I help you today?</h1>
              <p className="text-muted-foreground mb-8 text-sm">
                Chat with the most advanced AI to explore ideas, solve problems, and learn faster.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => handleSubmit({ text: s.prompt, images: [], useWebSearch: false })}
                    className="group p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <s.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold mb-0.5">{s.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                Free plan included. Need more power?{" "}
                <Link to="/pricing" className="text-primary underline">See plans</Link>
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto pb-4">
              {allMessages.map((m, i) => (
                <ChatMessage key={m.id ?? `live-${i}`} message={m} />
              ))}
            </div>
          )}
        </div>

        <ChatComposer
          onSubmit={(s) => handleSubmit(s)}
          disabled={isStreaming}
          onStop={handleStop}
        />
      </div>

      <FreePlanModal
        open={showFreeModal}
        onOpenChange={setShowFreeModal}
        onContinueFree={handleContinueFree}
        featureName="Pix Chat"
      />
    </div>
  );
}
