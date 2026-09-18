import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, Clock, ChevronRight, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

export interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  updatedAt: string;
}

interface FeatureHistorySidebarProps {
  items: HistoryItem[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewItem: () => void;
  label: string;
  newLabel?: string;
}

export default function FeatureHistorySidebar({
  items,
  isLoading,
  onSelect,
  onDelete,
  onNewItem,
  label,
  newLabel = "New",
}: FeatureHistorySidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();

  const handleSelect = (id: string) => {
    onSelect(id);
    setExpanded(false);
  };

  return (
    <>
      {/* Collapsed toggle - fixed, always visible when panel is closed */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="fixed left-2 top-16 z-40 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium glass text-muted-foreground hover:text-foreground transition-all shadow-md"
          title={`Show ${label}`}
          aria-label={`Show ${label}`}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Overlay + Panel — absolutely positioned so it does NOT resize page content */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop (click to close) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setExpanded(false)}
              className="fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-[2px]"
              aria-hidden
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed left-0 top-14 bottom-0 z-50 w-[85vw] max-w-[280px] border-r border-border/50 bg-background/95 backdrop-blur-md flex flex-col shadow-xl"
              role="dialog"
              aria-label={label}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-border/50 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
                  <History className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNewItem} title={newLabel} aria-label={newLabel}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(false)} title="Collapse" aria-label="Collapse history">
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* List */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {!user && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Sign in to see your history.
                    </p>
                  )}
                  {isLoading && (
                    <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
                  )}
                  {user && !isLoading && items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No history yet.
                    </p>
                  )}
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-primary/5 transition-colors group flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 truncate">
                          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">
                            {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                            {item.subtitle && ` • ${item.subtitle}`}
                          </span>
                        </div>
                      </div>
                      <Trash2
                        className="w-3 h-3 text-muted-foreground opacity-60 hover:text-destructive transition-all flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                      />
                      <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
