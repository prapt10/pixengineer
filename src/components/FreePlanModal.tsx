import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FreePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueFree: () => void;
  isRetrying?: boolean;
  /** Optional override copy for the feature name shown in the title */
  featureName?: string;
}

/**
 * Shown when a user's paid credits are exhausted. Explains the free-plan
 * limits and lets the user continue with the free auto-routed model, or
 * upgrade for premium quality / higher limits.
 */
const FreePlanModal = ({
  open,
  onOpenChange,
  onContinueFree,
  isRetrying = false,
  featureName,
}: FreePlanModalProps) => {
  const navigate = useNavigate();

  const limits = [
    "20 free daily credits, refreshed every 24 hours",
    "Auto-routed open-source models (quality may vary)",
    "Standard generation speed — no priority queue",
    "Full access to all tools, no feature lock-in",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass border-border/60">
        <DialogHeader>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs w-fit mb-3">
            <AlertCircle className="w-3.5 h-3.5" />
            Paid credits exhausted
          </div>
          <DialogTitle className="text-2xl">
            Continue with Free Mode{featureName ? ` · ${featureName}` : ""}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            You've run out of premium credits, but you can keep going on the
            free plan — no payment required.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">What's included in Free Mode</span>
          </div>
          <ul className="space-y-2">
            {limits.map((l) => (
              <li key={l} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            onClick={onContinueFree}
            disabled={isRetrying}
            className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            {isRetrying ? (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 animate-pulse" />
                Retrying...
              </span>
            ) : (
              "Continue with Free Mode"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate("/pricing");
            }}
          >
            Upgrade for Premium
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Premium uses higher-quality paid models for pixel-perfect, faster results.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default FreePlanModal;
