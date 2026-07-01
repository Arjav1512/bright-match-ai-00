import { useState } from "react";
import { toast } from "sonner";
import { getResumeSignedUrl } from "@/lib/resumeStorage";
import { cn } from "@/lib/utils";

interface Props {
  stored: string | null | undefined;
  studentId?: string;
  className?: string;
  children?: React.ReactNode;
  emptyLabel?: string;
}

/**
 * Renders a button that resolves a stored `resume_url` (in any of the three
 * historical shapes) to a signed URL on click and opens it in a new tab.
 * Shows structured, user-friendly errors when the file is missing or the
 * user isn't allowed to view it.
 */
const ResumeLink = ({ stored, studentId, className, children, emptyLabel }: Props) => {
  const [loading, setLoading] = useState(false);

  if (!stored) {
    return <span className="text-sm text-muted-foreground">{emptyLabel ?? "No resume uploaded"}</span>;
  }

  const openResume = async () => {
    setLoading(true);
    try {
      const result = await getResumeSignedUrl(stored);
      if (result.ok === true) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        console.error("[resume] open failed", { studentId, code: result.code, stored });
        toast.error(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={openResume}
      disabled={loading}
      className={cn("text-primary hover:underline disabled:opacity-60", className)}
    >
      {loading ? "Opening…" : (children ?? "View resume")}
    </button>
  );
};

export default ResumeLink;
