import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Send, Rocket, Code2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { setPageMeta } from "@/lib/seo";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPageMeta({
      title: "Contact — Pix Engineer",
      description: "Get in touch with Pix Engineer for support, billing, or partnership questions. We typically reply within one business day.",
      path: "/contact",
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const subject = encodeURIComponent(`Contact from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:support@pixengineer.com?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Opening your email client", description: "If it didn't open, email us directly at support@pixengineer.com" });
    }, 500);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Pix Engineer",
    description: "Get in touch with the Pix Engineer team for support, partnerships, or general inquiries.",
    url: "https://pixengineer.com/contact",
    mainEntity: {
      "@type": "Organization",
      name: "Pix Engineer",
      url: "https://pixengineer.com",
      email: "support@pixengineer.com",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@pixengineer.com",
        contactType: "customer support",
        availableLanguage: "English",
      },
    },
  };

  return (
    <div className="min-h-screen pt-24 pb-16 gradient-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container px-4 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Have a question about Build App, Design to Code, Prompt Studio, or Pix Chat? Need help with billing or a partnership? We'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass rounded-2xl p-8 h-full">
              <h2 className="text-xl font-semibold mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Tell us what you need help with..." rows={5} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                  {loading ? "Sending..." : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Send Message
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Email Us</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                For general inquiries, support, or business proposals:
              </p>
              <a href="mailto:support@pixengineer.com" className="text-primary hover:underline text-sm font-medium mt-1 inline-block">
                support@pixengineer.com
              </a>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Response Time</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                We typically respond within 24–48 hours on business days. For urgent matters, please mention "Urgent" in your subject line.
              </p>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-3">Common Topics</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Rocket className="w-4 h-4 text-primary shrink-0" />
                  <span>Build App — app generation, code quality, frameworks</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Design to Code — upload issues, output formats</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wand2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Prompt Studio — prompt crafting, analysis results</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                  <span>Pix Chat — AI assistant, image &amp; web search questions</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
