import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { resolveCoverUrl } from "@/lib/blog";
import { cn } from "@/lib/utils";

interface BlogCoverProps {
  cover: string | null | undefined;
  alt: string;
  className?: string;
  /** Tailwind aspect ratio class, keeps layout stable while loading. */
  ratioClassName?: string;
  /** Natural mode displays the complete image without enforcing a thumbnail crop. */
  displayMode?: "thumbnail" | "natural";
}

const BlogCover = ({
  cover,
  alt,
  className,
  ratioClassName = "aspect-[16/9]",
  displayMode = "thumbnail",
}: BlogCoverProps) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    resolveCoverUrl(cover).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [cover]);

  return (
    <div
      className={cn(
        "rounded-xl bg-muted",
        displayMode === "thumbnail" && "overflow-hidden",
        displayMode === "thumbnail" && ratioClassName,
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            "block w-full",
            displayMode === "thumbnail"
              ? "h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              : "h-auto object-contain",
          )}
        />
      ) : (
        <div
          className={cn(
            "flex w-full items-center justify-center text-muted-foreground/40",
            displayMode === "thumbnail" ? "h-full" : ratioClassName,
          )}
        >
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};

export default BlogCover;
