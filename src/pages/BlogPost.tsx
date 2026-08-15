import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import BlogCover from "@/components/blog/BlogCover";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, User, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBlogDate, readingTime, renderArticle, type BlogPost as Post } from "@/lib/blog";
import { Skeleton } from "@/components/ui/skeleton";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Post | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return (data as Post) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="py-20">
          <div className="container mx-auto max-w-2xl space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-40 w-full" />
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Post not found — Wroob Blog" description="This article is not available." path={`/blog/${slug ?? ""}`} noIndex />
        <Navbar />
        <section className="py-20">
          <div className="container mx-auto max-w-2xl text-center">
            <h1 className="font-display text-3xl font-bold">Post not found</h1>
            <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const published = post.published_at ?? post.created_at;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: published,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Wroob",
      logo: { "@type": "ImageObject", url: "https://wroob.in/favicon.png" },
    },
    mainEntityOfPage: `https://wroob.in/blog/${post.slug}`,
    articleSection: post.category ?? undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://wroob.in/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://wroob.in/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://wroob.in/blog/${post.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${post.title} — Wroob Blog`}
        description={post.excerpt ?? post.title}
        path={`/blog/${post.slug}`}
        type="article"
        image={post.cover_image && /^https?:\/\//i.test(post.cover_image) ? post.cover_image : undefined}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />

      <Navbar />
      <article className="py-20">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            {post.category && (
              <span className="mt-8 block text-xs font-semibold uppercase tracking-wider text-primary break-words">
                {post.category}
              </span>
            )}
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight break-words md:text-4xl">{post.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{post.author}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 shrink-0" />
                {formatBlogDate(published)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                {readingTime(post.content)} min read
              </span>
            </div>

            {post.cover_image && (
              <BlogCover cover={post.cover_image} alt={post.title} className="mt-8" />
            )}

            <div
              className="prose-wroob mt-10 text-base leading-relaxed text-foreground/80 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_img]:my-6 [&_img]:rounded-xl [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_strong]:text-foreground [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 break-words"
              dangerouslySetInnerHTML={{ __html: renderArticle(post.content) }}
            />
          </motion.div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
