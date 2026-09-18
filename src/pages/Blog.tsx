import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { setPageMeta } from "@/lib/seo";

export default function Blog() {
  useEffect(() => {
    setPageMeta({
      title: "Blog — Pix Engineer",
      description: "Articles on building apps with AI, design-to-code conversion, prompt engineering, Pix Chat, and modern web development.",
      path: "/blog",
    });
  }, []);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, excerpt, meta_keywords, cover_image_url, author, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const readTime = (excerpt: string) => Math.max(2, Math.ceil(excerpt.length / 200)) + " min read";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Pix Engineer Blog",
    description: "Tips and insights on building apps with AI, design-to-code conversion, prompt engineering, and modern web development.",
    url: "https://pixengineer.com/blog",
    publisher: {
      "@type": "Organization",
      name: "Pix Engineer",
      url: "https://pixengineer.com",
    },
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="container max-w-5xl mx-auto px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Insights on AI app building, design-to-code workflows, prompt engineering, and shipping software faster.
          </p>
        </header>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !posts?.length ? (
          <p className="text-center text-muted-foreground py-20">No blog posts yet. Check back soon!</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                <Card className="overflow-hidden h-full border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
                  {post.cover_image_url && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className="p-5 flex flex-col gap-3">
                    {post.meta_keywords && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.meta_keywords.split(",").slice(0, 2).map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs font-normal">
                            {kw.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <h2 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {readTime(post.excerpt)}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
