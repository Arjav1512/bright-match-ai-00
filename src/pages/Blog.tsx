import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import BlogCover from "@/components/blog/BlogCover";
import { motion } from "framer-motion";
import { CalendarDays, ArrowRight, User, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BLOG_LIST_FIELDS, formatBlogDate, type BlogPost } from "@/lib/blog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type BlogCard = Pick<
  BlogPost,
  "id" | "title" | "slug" | "excerpt" | "cover_image" | "category" | "author" | "published_at" | "updated_at"
>;

export function usePublishedPosts() {
  return useQuery({
    queryKey: ["blog-posts", "published"],
    queryFn: async (): Promise<BlogCard[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(BLOG_LIST_FIELDS)
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as BlogCard[];
    },
    staleTime: 60_000,
  });
}

const Blog = () => {
  const { data: posts = [], isLoading } = usePublishedPosts();

  const blogJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Wroob Blog",
      url: "https://wroob.in/blog",
      blogPost: posts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `https://wroob.in/blog/${p.slug}`,
        datePublished: p.published_at ?? undefined,
        articleSection: p.category ?? undefined,
        author: { "@type": "Person", name: p.author },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://wroob.in/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://wroob.in/blog" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Wroob Blog — Internship tips, careers & industry insights"
        description="Career guides, internship advice, and industry trends for students and employers from the Wroob team."
        path="/blog"
        jsonLd={blogJsonLd}
      />
      <Navbar />

      <section className="py-20">
        <div className="container">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Blog</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Career insights, platform updates, and industry trends.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="mt-14 text-center text-muted-foreground">No articles published yet.</p>
          ) : (
            <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="block">
                  <motion.article
                    className="group card-depth flex h-full flex-col p-4"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 6) * 0.06, duration: 0.4 }}
                  >
                    <BlogCover cover={post.cover_image} alt={post.title} />

                    <div className="mt-4 flex min-w-0 flex-1 flex-col">
                      {post.category && (
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary break-words">
                          {post.category}
                        </span>
                      )}
                      <h2 className="mt-1 font-display text-lg font-semibold break-words transition-colors group-hover:text-primary">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground break-words">{post.excerpt}</p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{post.author}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          {formatBlogDate(post.published_at)}
                        </span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </div>
                  </motion.article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Blog;
