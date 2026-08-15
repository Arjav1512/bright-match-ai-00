import { marked } from "marked";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string | null;
  author: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields needed for cards — never pull full article content into listings. */
export const BLOG_LIST_FIELDS =
  "id,title,slug,excerpt,cover_image,category,author,published,published_at,updated_at";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function renderArticle(markdown: string): string {
  const html = marked.parse(markdown ?? "", { async: false, breaks: true }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] });
}

export function readingTime(text: string): number {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatBlogDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const BUCKET = "blog-images";
const signedCache = new Map<string, string>();

/** cover_image holds either an absolute URL or a storage object path. */
export async function resolveCoverUrl(cover: string | null | undefined): Promise<string | null> {
  if (!cover) return null;
  if (/^https?:\/\//i.test(cover)) return cover;
  const cached = signedCache.get(cover);
  if (cached) return cached;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(cover, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) return null;
  signedCache.set(cover, data.signedUrl);
  return data.signedUrl;
}

export async function uploadBlogCover(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `covers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
