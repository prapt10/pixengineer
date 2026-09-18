import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Send, Copy, Check, Sparkles, RefreshCw, Wrench, Search, Trash2,
  PenLine, GraduationCap, Code2, Camera, Share2, BookOpen, Briefcase,
  MessageSquare, Megaphone, Heart, Palette, Music, ShoppingBag, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase, CUSTOM_API_URL } from "@/lib/supabase-custom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FeatureHistorySidebar, { type HistoryItem } from "@/components/FeatureHistorySidebar";
import FreePlanModal from "@/components/FreePlanModal";

type Mode = "generate" | "refine" | "analyze";
type Msg = { role: "user" | "assistant"; content: string };

type Category = {
  id: string;
  label: string;
  icon: typeof Wand2;
  color: string;
  suggestions: string[];
};

const MODES: { value: Mode; label: string; icon: typeof Wand2; desc: string }[] = [
  { value: "generate", label: "Generate", icon: Wand2, desc: "Create a prompt from scratch" },
  { value: "refine", label: "Improve", icon: Wrench, desc: "Improve an existing prompt" },
  { value: "analyze", label: "Analyzer", icon: Search, desc: "Evaluate prompt quality" },
];

const CATEGORIES: Category[] = [
  { id: "writer", label: "Writer", icon: PenLine, color: "from-blue-500 to-cyan-500", suggestions: ["Create a prompt for writing a compelling blog post intro that hooks readers instantly", "Build a prompt for generating creative fiction with vivid world-building and character depth", "Design a prompt for professional copywriting that converts visitors to customers", "Write a prompt for crafting persuasive email newsletters with high open rates"] },
  { id: "student", label: "Student", icon: GraduationCap, color: "from-green-500 to-emerald-500", suggestions: ["Create a prompt that explains complex topics simply with analogies and examples", "Build a study-guide generator prompt that creates flashcards from any subject material", "Design a prompt for summarizing research papers into clear key takeaways", "Write a prompt that generates practice exam questions with detailed answer explanations"] },
  { id: "coder", label: "Developer", icon: Code2, color: "from-purple-500 to-violet-500", suggestions: ["Create a prompt for generating clean, well-documented code with error handling", "Build a prompt for code review that catches bugs, security issues, and suggests improvements", "Design a prompt for writing technical documentation and API references", "Write a prompt for debugging that systematically identifies and fixes issues step-by-step"] },
  { id: "content", label: "Content", icon: Camera, color: "from-pink-500 to-rose-500", suggestions: ["Create a prompt for generating YouTube video scripts with strong hooks and CTAs", "Build a prompt for writing SEO-optimized articles that rank on search engines", "Design a prompt for creating engaging podcast episode outlines and show notes", "Write a prompt for generating viral short-form video ideas with trending hooks"] },
  { id: "social", label: "Social", icon: Share2, color: "from-orange-500 to-amber-500", suggestions: ["Create a prompt for generating platform-specific social media captions with hashtags", "Build a prompt for creating a 30-day content calendar with themed daily posts", "Design a prompt for crafting Twitter/X threads that drive engagement and followers", "Write a prompt for generating Instagram carousel content with storytelling flow"] },
  { id: "tutor", label: "Tutor", icon: BookOpen, color: "from-teal-500 to-cyan-500", suggestions: ["Create a prompt for building personalized lesson plans adapted to student levels", "Build a prompt that creates interactive quizzes with adaptive difficulty", "Design a prompt for explaining concepts using the Socratic method with guided questions", "Write a prompt for generating homework assignments with rubrics and learning objectives"] },
  { id: "business", label: "Business", icon: Briefcase, color: "from-slate-500 to-zinc-500", suggestions: ["Create a prompt for generating professional business proposals and pitch decks", "Build a prompt for writing SWOT analyses and competitive market research summaries", "Design a prompt for crafting investor-ready executive summaries and business plans", "Write a prompt for generating meeting agendas, minutes, and actionable follow-ups"] },
  { id: "marketing", label: "Marketing", icon: Megaphone, color: "from-red-500 to-orange-500", suggestions: ["Create a prompt for generating A/B test copy variations for landing pages", "Build a prompt for crafting email marketing sequences that nurture leads to conversion", "Design a prompt for generating ad copy for Google, Facebook, and Instagram campaigns", "Write a prompt for creating brand voice guidelines and messaging frameworks"] },
  { id: "support", label: "Support", icon: MessageSquare, color: "from-indigo-500 to-blue-500", suggestions: ["Create a system prompt for a customer support chatbot that handles complaints empathetically", "Build a prompt for generating FAQ pages from product documentation", "Design a prompt for creating canned responses that sound personal, not robotic", "Write a prompt for training AI to escalate complex issues to human agents intelligently"] },
  { id: "health", label: "Health", icon: Heart, color: "from-rose-500 to-pink-500", suggestions: ["Create a prompt for generating personalized meal plans based on dietary preferences", "Build a prompt for creating mindfulness and meditation guided scripts", "Design a prompt for generating workout routines tailored to fitness goals", "Write a prompt for health education content that's accurate and easy to understand"] },
  { id: "creative", label: "Creative", icon: Palette, color: "from-fuchsia-500 to-purple-500", suggestions: ["Create a prompt for generating detailed AI image descriptions (Midjourney/DALL-E style)", "Build a prompt for brainstorming creative brand name ideas with domain availability hints", "Design a prompt for generating UX microcopy for apps and websites", "Write a prompt for creating mood board descriptions and visual design direction briefs"] },
  { id: "music", label: "Music", icon: Music, color: "from-yellow-500 to-orange-500", suggestions: ["Create a prompt for generating song lyrics in specific genres and moods", "Build a prompt for writing music production briefs and arrangement descriptions", "Design a prompt for creating podcast intro scripts and episode descriptions", "Write a prompt for generating playlist descriptions and music review content"] },
  { id: "ecommerce", label: "E-Commerce", icon: ShoppingBag, color: "from-emerald-500 to-green-500", suggestions: ["Create a prompt for generating compelling product descriptions that drive sales", "Build a prompt for writing product comparison guides with pros/cons tables", "Design a prompt for creating abandoned cart email sequences that recover sales", "Write a prompt for generating customer review response templates that build trust"] },
  { id: "general", label: "General", icon: Lightbulb, color: "from-primary to-accent", suggestions: ["Create a prompt for extracting structured data from unstructured text documents", "Build a prompt for translating content while preserving tone and cultural context", "Design a prompt for generating pros/cons analyses for decision-making", "Write a prompt for creating step-by-step tutorials for any skill or software"] },
];

const CHAT_URL = `${CUSTOM_API_URL}/functions/v1/prompt-engineer`;
const DEFAULT_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-engineer`;

async function fetchPromptEngineer(init: RequestInit) {
  try {
    const response = await fetch(CHAT_URL, init);

    if (response.status === 403 && CHAT_URL !== DEFAULT_CHAT_URL) {
      const body = await response.clone().text().catch(() => "");
      if (body.includes("CNAME Cross-User Banned") || body.includes("Error 1014")) {
        return fetch(DEFAULT_CHAT_URL, init);
      }
    }

    return response;
  } catch (error) {
    if (CHAT_URL !== DEFAULT_CHAT_URL) {
      return fetch(DEFAULT_CHAT_URL, init);
    }
    throw error;
  }
}

export default function PromptEngineer() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("generate");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Msg[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /* ── History queries ── */
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["prompt-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("prompt_history")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prompt_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-history"] });
      toast({ title: "Conversation deleted" });
    },
  });

  const historyItems: HistoryItem[] = history.map((h: any) => ({
    id: h.id,
    title: h.title || "Untitled",
    subtitle: h.mode,
    updatedAt: h.updated_at,
  }));

  const loadHistory = (id: string) => {
    const entry = history.find((h: any) => h.id === id);
    if (!entry) return;
    setMessages((entry.messages as any) || []);
    setMode((entry.mode as Mode) || "generate");
    setSelectedCategory(entry.category);
    setActiveHistoryId(entry.id);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const streamPrompt = useCallback(
    async (msgs: Msg[], opts: { forceFreeModel?: boolean } = {}) => {
      const session = (await supabase.auth.getSession()).data.session;
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetchPromptEngineer({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: msgs,
          mode,
          forceFreeModel: opts.forceFreeModel ?? false,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({} as any));
        if (resp.status === 402 || errData?.code === "credits_exhausted") {
          const err: any = new Error(errData?.error || "Premium credits exhausted");
          err.code = "credits_exhausted";
          throw err;
        }
        throw new Error(errData?.error || `Request failed (${resp.status})`);
      }
      if (!resp.body) throw new Error("No response stream");

      let assistantSoFar = "";
      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) upsertAssistant(c);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) upsertAssistant(c);
          } catch { /* ignore */ }
        }
      }
    },
    [mode]
  );

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = text || input.trim();
      if (!content || isStreaming) return;

      const userMsg: Msg = { role: "user", content };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsStreaming(true);

      try {
        await streamPrompt(newMessages);
      } catch (e: any) {
        if (e?.code === "credits_exhausted") {
          setPendingMessages(newMessages);
          setShowFreeModal(true);
        } else {
          toast({ title: "Error", description: e.message || "Something went wrong", variant: "destructive" });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [input, messages, isStreaming, toast, streamPrompt]
  );

  const handleContinueFree = useCallback(async () => {
    if (!pendingMessages) {
      setShowFreeModal(false);
      return;
    }
    setIsStreaming(true);
    try {
      await streamPrompt(pendingMessages, { forceFreeModel: true });
      setShowFreeModal(false);
      setPendingMessages(null);
    } catch (e: any) {
      toast({
        title: "Free mode failed",
        description: e.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  }, [pendingMessages, streamPrompt, toast]);

  // Auto-save after streaming completes
  useEffect(() => {
    if (isStreaming || messages.length < 2 || !user) return;
    const title = messages[0]?.content?.slice(0, 60) || "Untitled";
    const saveHistory = async () => {
      try {
        if (activeHistoryId) {
          await supabase
            .from("prompt_history")
            .update({ messages: messages as any, title, mode, category: selectedCategory, updated_at: new Date().toISOString() })
            .eq("id", activeHistoryId);
        } else {
          const { data } = await supabase
            .from("prompt_history")
            .insert({ user_id: user.id, title, mode, category: selectedCategory, messages: messages as any })
            .select("id")
            .single();
          if (data) setActiveHistoryId(data.id);
        }
        queryClient.invalidateQueries({ queryKey: ["prompt-history"] });
      } catch { /* silent */ }
    };
    saveHistory();
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
    setSelectedCategory(null);
    setActiveHistoryId(null);
  };

  const activeCategory = selectedCategory ? CATEGORIES.find((c) => c.id === selectedCategory) : null;

  return (
    <div className="fixed inset-0 pt-14 flex gradient-bg">
      {/* History Sidebar */}
      <FeatureHistorySidebar
        items={historyItems}
        isLoading={historyLoading}
        onSelect={loadHistory}
        onDelete={(id) => deleteHistoryMutation.mutate(id)}
        onNewItem={clearChat}
        label="Chat History"
        newLabel="New Chat"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-4 max-w-5xl mx-auto w-full overflow-hidden">
        {/* Compact header */}
        <div className="flex items-center justify-between py-3 flex-shrink-0 pl-10 sm:pl-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
                Prompt <span className="gradient-text">Studio</span>
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">Craft • Refine • Analyze</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={clearChat} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium glass text-muted-foreground hover:text-destructive transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mode selector - pill tabs */}
        <div className="flex gap-2 mb-3 flex-shrink-0">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 border ${
                mode === m.value
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.02]"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-3 mb-2 scroll-smooth theme-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              {!selectedCategory ? (
                <>
                  <p className="text-muted-foreground text-xs text-center max-w-md">
                    Select a category for tailored suggestions, or just start typing.
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2 max-w-3xl w-full">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl glass hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all group"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                          <cat.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-center">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectedCategory(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    ← All categories
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeCategory?.color} flex items-center justify-center`}>
                      {activeCategory && <activeCategory.icon className="w-4 h-4 text-white" />}
                    </div>
                    <span className="font-semibold text-sm">{activeCategory?.label}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
                    {activeCategory?.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="text-left p-3 rounded-xl glass hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all leading-relaxed"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`relative max-w-[90%] sm:max-w-[85%] min-w-0 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "glass rounded-bl-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-sm [&_p]:mb-1.5 [&_ul]:text-sm [&_code]:text-xs [&_code]:bg-primary/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:text-xs [&_img]:max-w-full [&_table]:block [&_table]:overflow-x-auto break-words overflow-hidden">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  {msg.role === "assistant" && (
                    <button onClick={() => copyText(msg.content, idx)} className="absolute -bottom-2 -right-2 p-1.5 rounded-full glass opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                      {copied === idx ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 pb-3">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "generate" ? "Describe the prompt you want to create..." : mode === "refine" ? "Paste a prompt to improve..." : "Paste a prompt to analyze..."}
              className="min-h-[44px] max-h-28 resize-none text-sm glass border-border/50 focus:border-primary/50"
              rows={1}
            />
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="h-11 w-11 shrink-0 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <FreePlanModal
        open={showFreeModal}
        onOpenChange={(o) => {
          setShowFreeModal(o);
          if (!o) setPendingMessages(null);
        }}
        onContinueFree={handleContinueFree}
        isRetrying={isStreaming}
        featureName="Prompt Engineer"
      />
    </div>
  );
}
