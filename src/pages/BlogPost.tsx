import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { setPageMeta } from "@/lib/seo";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (post) {
      setPageMeta({
        title: `${post.title} — Pix Engineer Blog`,
        description: post.meta_description,
        path: `/blog/${post.slug}`,
        ogType: "article",
      });
    }
  }, [post]);

  const readTime = (content: string) => Math.max(2, Math.ceil(content.split(/\s+/).length / 200)) + " min read";

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-16">
        <div className="container max-w-3xl mx-auto px-4 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <Link to="/blog"><Button variant="outline">Back to Blog</Button></Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description,
    author: { "@type": "Person", name: post.author },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    publisher: { "@type": "Organization", name: "Pix Engineer" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://pixengineer.com/blog/${post.slug}` },
    ...(post.cover_image_url && { image: post.cover_image_url }),
    keywords: post.meta_keywords,
  };

  return (
    <article className="min-h-screen pt-20 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="container max-w-3xl mx-auto px-4">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {post.meta_keywords && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.meta_keywords.split(",").map((kw) => (
              <Badge key={kw} variant="secondary" className="text-xs">{kw.trim()}</Badge>
            ))}
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border/50">
          <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{post.author}</span>
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          )}
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{readTime(post.content)}</span>
        </div>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full rounded-xl mb-8 aspect-video object-cover"
          />
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-lg">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center">
          <p className="text-muted-foreground mb-4">Transform your designs into code with AI</p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              Try Pix Engineer Free
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
