import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Camera, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  fullName: string;
  onUpload: (url: string) => void;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedBlob(image: HTMLImageElement, crop: Crop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const size = 400;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    (crop.x ?? 0) * scaleX,
    (crop.y ?? 0) * scaleY,
    (crop.width ?? 0) * scaleX,
    (crop.height ?? 0) * scaleY,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
}

const AvatarUpload = ({ userId, currentUrl, fullName, onUpload }: AvatarUploadProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [uploading, setUploading] = useState(false);
  const [showPhotoTip, setShowPhotoTip] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const openFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED.map((t) => `.${t.split("/")[1]}`).join(",");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        toast({ title: "Invalid format", description: "Please upload JPG, PNG, or WebP only.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImgSrc(reader.result as string);
        setOpen(true);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleFileSelect = () => {
    setShowPhotoTip(true);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  const handleConfirm = async () => {
    if (!imgRef.current || !crop) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, crop);
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
      onUpload(publicUrl);
      toast({ title: "Avatar updated!" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleFileSelect}
        className="group relative h-24 w-24 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Avatar className="h-24 w-24 border-2 border-border">
          <AvatarImage src={currentUrl || undefined} alt={fullName} />
          <AvatarFallback className="text-2xl font-semibold bg-muted text-muted-foreground">
            {getInitials(fullName || "?")}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-6 w-6 text-white" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
          </DialogHeader>
          {imgSrc && (
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-80"
                />
              </ReactCrop>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={uploading}>
              {uploading ? "Uploading..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showPhotoTip} onOpenChange={setShowPhotoTip}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-3">
              <div className="rounded-full bg-primary/10 p-3">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Upload a Professional Photo</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <p>
                Your profile photo is one of the first things employers and fellow students see. Please choose a clear, professional-looking image — similar to what you'd use on LinkedIn.
              </p>
              <ul className="text-left text-sm space-y-1 mt-3 list-disc list-inside text-muted-foreground">
                <li>Use a recent, well-lit headshot</li>
                <li>Face the camera with a friendly, approachable expression</li>
                <li>Avoid group photos, selfies with filters, or casual snapshots</li>
                <li>A plain or uncluttered background works best</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => { setShowPhotoTip(false); openFilePicker(); }}>
              Got it — Choose Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AvatarUpload;
