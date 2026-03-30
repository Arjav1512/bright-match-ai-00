import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Loader2 } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_CAPTION = 300;

interface PostComposerProps {
  onPostCreated: () => void;
}

const PostComposer = ({ onPostCreated }: PostComposerProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: "Invalid file type", description: "Only JPG, PNG, and WebP are allowed.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum size is 10 MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setSubmitting(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("post-images")
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);

      const authorType = role === "employer" ? "company" : "student";
      const { error: insertErr } = await supabase.from("posts").insert({
        author_id: user.id,
        author_type: authorType,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
      });

      if (insertErr) throw insertErr;

      toast({ title: "Post published!" });
      setCaption("");
      clearFile();
      onPostCreated();
    } catch (err: any) {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Create a Post</h3>

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="rounded-lg max-h-64 w-full object-cover" />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 rounded-full"
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm">Click to add an image</span>
          <span className="text-xs">JPG, PNG, WebP · Max 10 MB</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFile}
      />

      <div className="space-y-1">
        <Textarea
          placeholder="Write a caption (optional)..."
          value={caption}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CAPTION) setCaption(e.target.value);
          }}
          rows={2}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {caption.length} / {MAX_CAPTION}
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!file || submitting}
        className="w-full"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
        {submitting ? "Publishing..." : "Post"}
      </Button>
    </div>
  );
};

export default PostComposer;
