import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Copy, Check, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Smoothly reveals `target` character-by-character while streaming.
 * A single rAF loop runs for the lifetime of the message; chunk updates
 * only mutate refs so the typewriter never restarts/blinks mid-stream.
 * When `pending` flips false, the remaining text catches up smoothly.
 */
function useTypewriter(target: string, pending: boolean | undefined) {
  const targetRef = useRef(target);
  const pendingRef = useRef(pending);
  const [shown, setShown] = useState(() => (pending ? "" : target));
  const shownLenRef = useRef(shown.length);

  // Keep refs in sync without restarting the loop.
  targetRef.current = target;
  pendingRef.current = pending;

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let done = false;

    const step = (t: number) => {
      if (done) return;
      const dt = last ? t - last : 16;
      last = t;
      const tgt = targetRef.current;
      const len = shownLenRef.current;
      if (len < tgt.length) {
        const backlog = tgt.length - len;
        // Faster when behind, gentle baseline for natural typing feel.
        const charsPerMs = Math.min(1.2, 0.05 + backlog / 250);
        const add = Math.max(1, Math.floor(dt * charsPerMs));
        const nextLen = Math.min(tgt.length, len + add);
        shownLenRef.current = nextLen;
        setShown(tgt.slice(0, nextLen));
      } else if (!pendingRef.current) {
        // Caught up and stream finished — stop the loop.
        done = true;
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { done = true; cancelAnimationFrame(raf); };
  }, []);

  // Safety: if not pending and target shrinks/changes outside streaming, sync immediately.
  useEffect(() => {
    if (!pending && shownLenRef.current !== target.length) {
      shownLenRef.current = target.length;
      setShown(target);
    }
  }, [pending, target]);

  return shown;
}

export type ChatMessageItem = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { type: string; url?: string }[] | null;
  pending?: boolean;
};

function CodeBlockCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon" variant="ghost"
      className="absolute top-2 right-2 h-7 w-7 bg-background/40 hover:bg-background/70"
      aria-label="Copy code"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function ChatMessageInner({ message }: { message: ChatMessageItem }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const displayed = useTypewriter(message.content || "", !isUser && message.pending);


  return (
    <div className={cn("flex gap-3 px-4 py-5", isUser ? "bg-transparent" : "bg-muted/30")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary/10 text-primary" : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{isUser ? "You" : "Pix Chat"}</span>
          {!isUser && message.content && !message.pending && (
            <Button
              size="icon" variant="ghost" className="h-6 w-6"
              aria-label="Copy message"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          )}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((a, i) => a.url ? (
              <img key={i} src={a.url} alt="attachment" className="max-h-40 rounded-lg border border-border" />
            ) : null)}
          </div>
        )}

        {message.pending && !message.content ? (
          <div className="flex gap-1.5 items-center h-5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden
            prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
            prose-code:before:hidden prose-code:after:hidden
            prose-p:leading-relaxed prose-p:my-2
            prose-headings:mt-4 prose-headings:mb-2
            prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
            [&_img]:max-w-full [&_img]:h-auto
            [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => {
                  const text = extractText(children);
                  return (
                    <div className="relative my-3 rounded-lg overflow-hidden bg-zinc-900 border border-border">
                      <CodeBlockCopy text={text} />
                      <pre className="!bg-transparent !p-4 overflow-x-auto text-sm">{children}</pre>
                    </div>
                  );
                },
                code: ({ className, children, ...rest }: any) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[0.85em] font-mono">
                        {children}
                      </code>
                    );
                  }
                  return <code className={className} {...rest}>{children}</code>;
                },
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{children}</a>
                ),
              }}
            >
              {isUser ? (message.content || "") : displayed}
            </ReactMarkdown>
            {message.pending && displayed && (
              <span className="inline-block w-1.5 h-4 bg-primary/70 align-middle ml-0.5 animate-pulse rounded-sm" />
            )}

          </div>
        )}
      </div>
    </div>
  );
}

function extractText(node: any): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node?.props?.children) return extractText(node.props.children);
  return "";
}

export default memo(ChatMessageInner);
