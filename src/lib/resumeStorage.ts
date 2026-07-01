// Central helpers for resume storage. The `resumes` bucket is private, so all
// reads go through short-lived signed URLs. Storage keys have historically been
// written in three shapes and we must accept all of them:
//   1. `${userId}/${timestamp}-${filename}`  (current onboarding format)
//   2. `${userId}/${filename}`                (current profile-page format)
//   3. `https://<project>.supabase.co/storage/v1/object/public/resumes/...`
//      (legacy public-URL format from before the bucket was made private)
//
// Everything in the app should route through the helpers below so that error
// handling, path normalisation, and legacy compatibility stay consistent.

import { supabase } from "@/integrations/supabase/client";

export type ResumeErrorCode =
  | "empty"        // no resume has been uploaded
  | "invalid"      // stored value is present but unparseable
  | "not_found"    // signed URL failed because the object is missing
  | "forbidden"    // signed URL failed because of RLS/permissions
  | "unknown";     // any other failure

export type ResumeSignResult =
  | { ok: true; url: string; storagePath: string }
  | { ok: false; code: ResumeErrorCode; message: string; storagePath?: string };

/** Turn either shape of `resume_url` into a storage object key. */
export const normalizeResumePath = (stored: string | null | undefined): string | null => {
  if (!stored) return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("http")) return trimmed;
  const marker = "/resumes/";
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(trimmed.slice(idx + marker.length));
  } catch {
    return trimmed.slice(idx + marker.length);
  }
};

/** Human-friendly filename derived from any stored value. */
export const resumeDisplayName = (stored: string | null | undefined): string | null => {
  const path = normalizeResumePath(stored);
  if (!path) return null;
  const last = path.split("/").pop() || "Resume";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

const classifyError = (message: string | undefined): ResumeErrorCode => {
  if (!message) return "unknown";
  const m = message.toLowerCase();
  if (m.includes("not found") || m.includes("no such") || m.includes("does not exist")) {
    return "not_found";
  }
  if (m.includes("permission") || m.includes("unauthorized") || m.includes("forbidden") || m.includes("row-level")) {
    return "forbidden";
  }
  return "unknown";
};

export const resumeErrorMessage = (code: ResumeErrorCode): string => {
  switch (code) {
    case "empty":     return "No resume has been uploaded.";
    case "invalid":   return "Resume file could not be located.";
    case "not_found": return "Resume file could not be located.";
    case "forbidden": return "You do not have permission to view this resume.";
    default:          return "Unable to open resume. Please try again.";
  }
};

/**
 * Resolve a stored `resume_url` value into a signed URL. Structured errors let
 * callers show accurate, user-friendly messages instead of generic 404 pages.
 */
export const getResumeSignedUrl = async (
  stored: string | null | undefined,
  expiresIn = 3600
): Promise<ResumeSignResult> => {
  if (!stored || !stored.trim()) {
    return { ok: false, code: "empty", message: resumeErrorMessage("empty") };
  }
  const storagePath = normalizeResumePath(stored);
  if (!storagePath) {
    console.error("[resume] invalid stored value", { stored });
    return { ok: false, code: "invalid", message: resumeErrorMessage("invalid") };
  }

  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    const code = classifyError(error?.message);
    console.error("[resume] signed URL generation failed", {
      storagePath,
      code,
      error: error?.message,
    });
    return { ok: false, code, message: resumeErrorMessage(code), storagePath };
  }

  return { ok: true, url: data.signedUrl, storagePath };
};

/**
 * Upload a resume for the current user. Verifies that the object exists after
 * upload so we never persist a `resume_url` for a file that Storage didn't
 * actually accept.
 */
export const uploadResume = async (
  userId: string,
  file: File,
  opts: { prefixWithTimestamp?: boolean } = {}
): Promise<{ ok: true; path: string } | { ok: false; message: string }> => {
  const safeName = file.name.replace(/[\r\n]/g, "").trim() || "resume";
  const key = opts.prefixWithTimestamp ? `${Date.now()}-${safeName}` : safeName;
  const path = `${userId}/${key}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadError) {
    console.error("[resume] upload failed", { path, error: uploadError.message });
    return { ok: false, message: uploadError.message };
  }

  // Post-upload verification: generate a short signed URL to confirm the
  // object is retrievable before we persist the DB reference.
  const verify = await supabase.storage.from("resumes").createSignedUrl(path, 60);
  if (verify.error || !verify.data?.signedUrl) {
    console.error("[resume] post-upload verification failed", {
      path,
      error: verify.error?.message,
    });
    return {
      ok: false,
      message: "Upload could not be verified. Please try again.",
    };
  }

  return { ok: true, path };
};
