import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { POSTS } from "./Blog";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="py-20">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            <span className="mt-8 block text-xs font-semibold uppercase tracking-wider text-primary">{post.category}</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{post.title}</h1>

            <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {post.date}
            </div>

            <div className="mt-10 text-base leading-relaxed text-foreground/80 whitespace-pre-line">
              {post.content}
            </div>
          </motion.div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
