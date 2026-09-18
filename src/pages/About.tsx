import { useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Target, Zap, Heart, Rocket, Code2, Wand2, MessageSquare } from "lucide-react";
import { setPageMeta } from "@/lib/seo";

export default function About() {
  useEffect(() => {
    setPageMeta({
      title: "About — Pix Engineer | AI App Builder & Design to Code",
      description: "Pix Engineer is an AI platform to build full-stack apps, convert designs to code, and craft perfect prompts — in one place.",
      path: "/about",
    });
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Pix Engineer",
    description: "Pix Engineer is an AI-powered platform that lets you build full-stack apps, convert designs to code, and craft perfect prompts.",
    url: "https://pixengineer.com/about",
    mainEntity: {
      "@type": "Organization",
      name: "Pix Engineer",
      url: "https://pixengineer.com",
      description: "AI-powered app builder, design-to-code converter, and prompt engineering platform.",
      foundingDate: "2025",
      sameAs: [],
      offers: [
        { "@type": "Offer", name: "Build App", description: "Generate full-stack web apps from text prompts" },
        { "@type": "Offer", name: "Design to Code", description: "Convert UI designs to production-ready code" },
        { "@type": "Offer", name: "Prompt Studio", description: "Generate, improve, and analyze AI prompts" },
        { "@type": "Offer", name: "Pix Chat", description: "Chat with an advanced AI assistant for everyday tasks" },
      ],
    },
  };

  return (
    <div className="min-h-screen pt-24 pb-16 gradient-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container px-4 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            About <span className="gradient-text">Pix Engineer</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            One platform to build apps, convert designs, and engineer prompts — powered by AI.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Our Mission</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Pix Engineer exists to eliminate the gap between ideas and working software. Whether you have a rough concept in your head, a polished design on your screen, or a prompt that needs refining — our AI-powered tools turn it into reality in seconds. We believe everyone should be able to ship software, regardless of technical background.
            </p>
          </div>

          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">What We Offer</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Rocket className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Build App</p>
                  <p className="text-muted-foreground text-sm">Our flagship feature. Describe any app in plain English and watch it come to life — complete with multi-page navigation, interactive components, and downloadable source code. From e-commerce stores to SaaS dashboards, build anything with a single prompt.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Code2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Design to Code</p>
                  <p className="text-muted-foreground text-sm">Upload any UI design, wireframe, or hand-drawn sketch and get pixel-perfect, responsive HTML &amp; CSS (or your preferred framework) in seconds. No manual slicing, no guesswork.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wand2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Prompt Studio</p>
                  <p className="text-muted-foreground text-sm">Generate, improve, and analyze AI prompts with our dedicated prompt engineering tool. Craft prompts that deliver better results across any AI workflow — from coding to content creation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Pix Chat</p>
                  <p className="text-muted-foreground text-sm">Your everyday AI assistant. Explore ideas, solve problems, write code, summarize content, translate, and learn faster — with image upload and web search built in.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Who We Serve</h2>
            </div>
            <ul className="text-muted-foreground leading-relaxed space-y-2">
              <li>• <strong className="text-foreground">Entrepreneurs & founders</strong> who want to prototype and ship MVPs without a dev team.</li>
              <li>• <strong className="text-foreground">Designers</strong> who want to turn mockups into production-ready code instantly.</li>
              <li>• <strong className="text-foreground">Developers</strong> who want to accelerate front-end implementation and boilerplate generation.</li>
              <li>• <strong className="text-foreground">Prompt engineers & AI enthusiasts</strong> who want to craft, refine, and analyze prompts effectively.</li>
              <li>• <strong className="text-foreground">Startups & agencies</strong> that need to ship landing pages, dashboards, and apps at speed.</li>
            </ul>
          </div>

          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Our Values</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              We obsess over quality, speed, and simplicity. Every feature — from Build App to Prompt Studio — is designed to save you time and remove friction from the creative process. We're constantly improving our AI models to deliver cleaner, more accessible, and more maintainable output. Your ideas deserve to ship fast.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
