import { useEffect } from "react";
import { motion } from "framer-motion";

export default function RefundPolicy() {
  useEffect(() => {
    document.title = "Refund Policy — Pix Engineer";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Understand Pix Engineer's refund policy for credit purchases used across Build App, Design to Code, Prompt Studio, and Pix Chat features.");
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-16 gradient-bg">
      <div className="container px-4 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">Effective Date:</strong> April 2026</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">No Refunds</h2>
            <p>All credit purchases on Pix Engineer are final and non-refundable. Credits are used across all Platform features — Build App, Design to Code, Prompt Studio, and Pix Chat. Because credits are consumed instantly upon generation, we are unable to offer refunds, returns, or exchanges for any purchased credits.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Why No Refunds?</h2>
            <p>Pix Engineer is a credit-based AI platform. Each generation request — whether building an app, converting a design, engineering a prompt, or chatting with Pix Chat — uses computational resources (AI processing, code generation, image analysis) that are consumed immediately and cannot be recovered.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Free Tier</h2>
            <p>Every account has access to a free tier with unlimited usage using auto-selected AI models. This allows you to fully evaluate all features — Build App, Design to Code, Prompt Studio, and Pix Chat — before purchasing credits for premium AI models. We encourage you to explore the free tier to ensure the service meets your expectations.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Credit Costs</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Build App:</strong> 50 credits per generation</li>
              <li><strong className="text-foreground">Design to Code:</strong> 30 credits per conversion</li>
              <li><strong className="text-foreground">Prompt Generate:</strong> 6 credits per generation</li>
              <li><strong className="text-foreground">Prompt Improve:</strong> 5 credits per improvement</li>
              <li><strong className="text-foreground">Prompt Analyzer:</strong> 4 credits per analysis</li>
              <li><strong className="text-foreground">Pix Chat:</strong> 2 credits per message (premium model)</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground pt-2">Exceptions</h2>
            <p>In rare cases where a technical error on our end prevents a generation from completing and your credits are still consumed, please contact our support team. We will review the issue and may credit your account with replacement credits at our discretion.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Contact</h2>
            <p>If you believe you've been charged in error or have questions about this policy, please reach out at <a href="mailto:support@pixengineer.com" className="text-primary hover:underline">support@pixengineer.com</a>.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
