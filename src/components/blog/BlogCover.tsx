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
}

const BlogCover = ({ cover, alt, className, ratioClassName = "aspect-[16/9]" }: BlogCoverProps) => {
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
    <div className={cn("overflow-hidden rounded-xl bg-muted", ratioClassName, className)}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};

export default BlogCover;
