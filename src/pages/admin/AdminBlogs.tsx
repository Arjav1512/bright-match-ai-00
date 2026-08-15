import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import BlogCover from "@/components/blog/BlogCover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Pencil, Trash2, Eye, EyeOff, Upload, Loader2 } from "lucide-react";
import {
  BLOG_LIST_FIELDS, formatBlogDate, renderArticle, slugify, uploadBlogCover, type BlogPost,
} from "@/lib/blog";

type Row = Omit<BlogPost, "content">;

interface FormState {
  id?: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  cover_image: string | null;
  excerpt: string;
  content: string;
  published: boolean;
  published_at: string;
}

const emptyForm = (): FormState => ({
  title: "", slug: "", category: "", author: "Wroob Team", cover_image: null,
  excerpt: "", content: "", published: false,
  published_at: new Date().toISOString().slice(0, 10),
});

const AdminBlogs = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select(BLOG_LIST_FIELDS + ",created_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load blogs", description: error.message, variant: "destructive" });
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "published" && !r.published) return false;
      if (statusFilter === "draft" && r.published) return false;
      if (!q) return true;
      return [r.title, r.slug, r.category, r.author].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const openCreate = () => { setForm(emptyForm()); setSlugTouched(false); };

  const openEdit = async (row: Row) => {
    const { data, error } = await supabase.from("blog_posts").select("*").eq("id", row.id).maybeSingle();
    if (error || !data) {
      toast({ title: "Couldn't open blog", description: error?.message, variant: "destructive" });
      return;
    }
    const p = data as BlogPost;
    setSlugTouched(true);
    setForm({
      id: p.id, title: p.title, slug: p.slug, category: p.category ?? "", author: p.author,
      cover_image: p.cover_image, excerpt: p.excerpt ?? "", content: p.content,
      published: p.published,
      published_at: (p.published_at ?? p.created_at).slice(0, 10),
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = await uploadBlogCover(file);
      setForm((f) => (f ? { ...f, cover_image: path } : f));
      toast({ title: "Cover image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const slug = slugify(form.slug || form.title);
    if (!slug) { toast({ title: "A valid slug is required", variant: "destructive" }); return; }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug,
      category: form.category.trim() || null,
      author: form.author.trim() || "Wroob Team",
      cover_image: form.cover_image,
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      published: form.published,
      published_at: form.published ? new Date(form.published_at).toISOString() : null,
    };

    const res = form.id
      ? await supabase.from("blog_posts").update(payload).eq("id", form.id)
      : await supabase.from("blog_posts").insert(payload);

    setSaving(false);
    if (res.error) {
      const dup = res.error.message.includes("duplicate key");
      toast({
        title: dup ? "That slug is already used" : "Save failed",
        description: dup ? "Choose a different slug." : res.error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: form.id ? "Blog updated" : "Blog created" });
    setForm(null);
    fetchRows();
  };

  const togglePublish = async (row: Row) => {
    const next = !row.published;
    const { error } = await supabase
      .from("blog_posts")
      .update({ published: next, published_at: next ? (row.published_at ?? new Date().toISOString()) : null })
      .eq("id", row.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: next ? "Blog published" : "Blog unpublished" });
    fetchRows();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", pendingDelete.id);
    setPendingDelete(null);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Blog deleted" });
    fetchRows();
  };

  return (
    <AdminLayout title="Blog">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search title, slug, author…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New blog</Button>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No blogs found.</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Cover</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Published</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3"><BlogCover cover={r.cover_image} alt={r.title} className="w-20" /></td>
                    <td className="max-w-[240px] p-3 font-medium break-words">
                      {r.title}
                      <span className="block text-xs font-normal text-muted-foreground break-all">/blog/{r.slug}</span>
                    </td>
                    <td className="p-3 break-words">{r.category || "—"}</td>
                    <td className="p-3 break-words">{r.author}</td>
                    <td className="p-3">
                      <Badge variant={r.published ? "default" : "secondary"}>{r.published ? "Published" : "Draft"}</Badge>
                    </td>
                    <td className="p-3 whitespace-nowrap">{formatBlogDate(r.published_at) || "—"}</td>
                    <td className="p-3 whitespace-nowrap">{formatBlogDate(r.updated_at)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => togglePublish(r)}>
                          {r.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setPendingDelete(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <Dialog open={!!form} onOpenChange={(o) => { if (!o) { setForm(null); setPreview(false); } }}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit blog" : "New blog"}</DialogTitle>
            <DialogDescription>Content supports Markdown: headings, bold, italic, links, lists, quotes and images.</DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setForm({ ...form, title, slug: slugTouched ? form.slug : slugify(title) });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Author</Label>
                  <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover image</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <BlogCover cover={form.cover_image} alt="Cover preview" className="w-40" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload
                    </Button>
                    {form.cover_image && (
                      <Button type="button" variant="ghost" onClick={() => setForm({ ...form, cover_image: null })}>Remove</Button>
                    )}
                  </div>
                  <input
                    ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                  />
                </div>
                <Input
                  placeholder="…or paste an image URL"
                  value={form.cover_image && /^https?:\/\//i.test(form.cover_image) ? form.cover_image : ""}
                  onChange={(e) => setForm({ ...form, cover_image: e.target.value || null })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Excerpt</Label>
                <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Content (Markdown)</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPreview((p) => !p)}>
                    {preview ? "Edit" : "Preview"}
                  </Button>
                </div>
                {preview ? (
                  <div
                    className="min-h-[200px] rounded-md border p-4 text-sm leading-relaxed text-foreground/80 break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-semibold [&_img]:my-4 [&_img]:rounded-lg [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
                    dangerouslySetInnerHTML={{ __html: renderArticle(form.content) }}
                  />
                ) : (
                  <Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                  <Label>{form.published ? "Published" : "Draft"}</Label>
                </div>
                <div className="space-y-1.5">
                  <Label>Publication date</Label>
                  <Input type="date" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this blog?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be permanently removed from the website. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminBlogs;
