import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Globe, X, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fileToDataUrl } from "@/lib/chat-api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type ComposerSubmit = {
  text: string;
  images: string[]; // data URLs
  useWebSearch: boolean;
};

export default function ChatComposer({
  onSubmit, disabled, onStop,
}: {
  onSubmit: (data: ComposerSubmit) => void;
  disabled?: boolean;
  onStop?: () => void;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, 3)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 4 * 1024 * 1024) {
        toast({ title: "Image too large", description: `${file.name} exceeds 4MB.`, variant: "destructive" });
        continue;
      }
      next.push(await fileToDataUrl(file));
    }
    setImages((prev) => [...prev, ...next].slice(0, 4));
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    if (disabled) return;
    onSubmit({ text: trimmed, images, useWebSearch });
    setText("");
    setImages([]);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur">
      <div className="max-w-3xl mx-auto p-3">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((src, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={src} alt="upload" className="w-full h-full object-cover" />
                <button
                  type="button" aria-label="Remove image"
                  onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:ring-2 focus-within:ring-primary/30 transition">
          <Button
            type="button" size="icon" variant="ghost" className="h-9 w-9 flex-shrink-0"
            aria-label="Attach image"
            onClick={() => fileInput.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            ref={fileInput} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />

          <Button
            type="button" size="sm" variant="ghost"
            aria-label="Toggle web search"
            className={cn("h-9 px-2 gap-1.5 flex-shrink-0", useWebSearch && "text-primary bg-primary/10")}
            onClick={() => setUseWebSearch((v) => !v)}
            disabled={disabled}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Search</span>
          </Button>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Message Pix Chat…"
            rows={1}
            className="flex-1 min-h-[40px] max-h-40 resize-none border-0 bg-transparent focus-visible:ring-0 px-1 py-2"
            disabled={disabled}
          />

          {disabled && onStop ? (
            <Button type="button" size="icon" className="h-9 w-9 rounded-xl" aria-label="Stop" onClick={onStop}>
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button" size="icon" aria-label="Send message"
              className="h-9 w-9 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-50"
              disabled={disabled || (!text.trim() && images.length === 0)}
              onClick={submit}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Pix Chat can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
