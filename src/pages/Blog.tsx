import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { CalendarDays, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const POSTS = [
  { slug: "5-tips-to-land-your-first-tech-internship", title: "5 Tips to Land Your First Tech Internship", excerpt: "Breaking into tech can feel overwhelming. Here's how to stand out from the crowd and get noticed by top companies.", date: "Feb 28, 2026", category: "Career Tips", content: "Breaking into the tech industry as an intern can feel daunting, but with the right approach, you can stand out. First, focus on building real projects — even small ones — that demonstrate your skills. Second, tailor your resume to highlight relevant coursework and side projects. Third, practice common technical interview questions. Fourth, network through LinkedIn and university career fairs. Fifth, apply early and broadly — don't limit yourself to just the big names." },
  { slug: "why-skills-based-hiring-is-the-future", title: "Why Skills-Based Hiring Is the Future", excerpt: "Traditional resumes are losing relevance. Learn how skills-based matching is transforming the way companies find talent.", date: "Feb 20, 2026", category: "Industry", content: "The hiring landscape is shifting. Companies are increasingly moving away from degree-based requirements and toward skills-based assessments. This approach opens doors for talented individuals regardless of their educational background. Platforms like Wroob are at the forefront of this movement, matching students with opportunities based on what they can actually do, not just where they went to school." },
  { slug: "how-to-build-a-portfolio-that-gets-interviews", title: "How to Build a Portfolio That Gets Interviews", excerpt: "Your portfolio is your most powerful tool. We break down what hiring managers actually look for.", date: "Feb 12, 2026", category: "Career Tips", content: "A strong portfolio can be the difference between landing an interview and being overlooked. Start with 3-5 quality projects that showcase different skills. Include clear descriptions of your role, the technologies used, and the impact of your work. Make it visually clean and easy to navigate. Most importantly, include a compelling about section that tells your story." },
  { slug: "remote-internships-what-to-expect-in-2026", title: "Remote Internships: What to Expect in 2026", excerpt: "Remote work is here to stay. Here's how to thrive in a virtual internship and make a lasting impression.", date: "Feb 5, 2026", category: "Trends", content: "Remote internships offer incredible flexibility but require discipline. Set up a dedicated workspace, maintain regular communication with your team, and be proactive about asking for feedback. Use tools like Slack, Notion, and video calls to stay connected. Remember, out of sight shouldn't mean out of mind — make your contributions visible." },
  { slug: "wroob-platform-update-match-scores-2", title: "Wroob Platform Update: Match Scores 2.0", excerpt: "We've upgraded our matching algorithm to better surface opportunities tailored to your unique skill set.", date: "Jan 28, 2026", category: "Product", content: "We're excited to announce Match Scores 2.0! Our improved algorithm now considers a wider range of factors including skill proficiency levels, location preferences, and work culture fit. Students will see more relevant internship recommendations, and employers will receive better-matched applicants. This update is live for all users." },
  { slug: "from-intern-to-full-time-success-stories", title: "From Intern to Full-Time: Success Stories", excerpt: "Real stories from students who turned their Wroob internships into full-time offers.", date: "Jan 15, 2026", category: "Stories", content: "Meet three students who parlayed their Wroob internships into full-time positions. Priya started as a marketing intern at a startup and is now leading their content strategy. Arjun's engineering internship turned into a junior developer role within three months. And Sneha's design internship led to a full-time UX position at a growing fintech company. Their secret? Going above and beyond, building relationships, and treating every task as a learning opportunity." },
];

const Blog = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <section className="py-20">
      <div className="container">
        <motion.div className="mx-auto max-w-2xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Blog</h1>
          <p className="mt-4 text-lg text-muted-foreground">Career insights, platform updates, and industry trends.</p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6">
          {POSTS.map((post, i) => (
            <Link key={i} to={`/blog/${post.slug}`} className="block">
              <motion.article
                className="group card-depth p-6 cursor-pointer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">{post.category}</span>
                    <h2 className="mt-1 font-display text-lg font-semibold group-hover:text-primary transition-colors">{post.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {post.date}
                    </div>
                  </div>
                  <ArrowRight className="mt-6 h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:text-primary group-hover:translate-x-1" />
                </div>
              </motion.article>
            </Link>
          ))}
        </div>
      </div>
    </section>
    <Footer />
  </div>
);

export default Blog;
