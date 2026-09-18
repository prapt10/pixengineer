import { useEffect } from "react";
import { motion } from "framer-motion";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy — Pix Engineer";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Learn how Pix Engineer collects, uses, and protects your data across our AI app builder, design-to-code converter, Pix Chat assistant, and prompt engineering tools.");
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-16 gradient-bg">
      <div className="container px-4 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">Effective Date:</strong> April 2026</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Information We Collect</h2>
            <p>We collect the following information when you use Pix Engineer:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your email address and account credentials during registration.</li>
              <li>Design images you upload for the Design to Code feature.</li>
              <li>Text prompts and descriptions you submit to Build App and Prompt Studio.</li>
              <li>Chat messages, attached images, and conversation history from Pix Chat.</li>
              <li>Generated code and conversation history stored in your account.</li>
              <li>Usage analytics and interaction data to improve our services.</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground pt-2">How We Use Your Information</h2>
            <p>Your information is used to provide and improve our services — including app generation, design-to-code conversion, and prompt engineering. We use anonymized, aggregated data to enhance AI model performance. We do not sell your personal data to third parties.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Data Storage & Security</h2>
            <p>Uploaded images, generated code, and conversation histories are stored securely in our cloud infrastructure. All data is encrypted in transit and at rest. You may request deletion of your uploaded data and generated content at any time by contacting support.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">AI Processing</h2>
            <p>Your prompts, uploaded images, and descriptions are processed by third-party AI models (including OpenAI and other providers) to generate code and content. We do not share your personal account information with these providers — only the content necessary for generation.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Cookies</h2>
            <p>We use essential cookies for authentication and session management. No third-party tracking cookies are used.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data, uploaded content, and generated code. Contact our support team at <a href="mailto:support@pixengineer.com" className="text-primary hover:underline">support@pixengineer.com</a> to exercise these rights.</p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Changes</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
