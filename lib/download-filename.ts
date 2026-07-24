import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/supabase/workspace";

/** Safe segment for download filenames. */
export function slugifyFilenamePart(value: string, fallback = "document") {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned || fallback;
}

/**
 * Build a download name like `thabiso-foods-INV-0004.pdf`.
 * Document labels keep readable casing for numbers (INV-0004, SL-0012).
 */
export function buildDownloadFilename(
  businessName: string,
  documentLabel: string,
  extension: string,
) {
  const business = slugifyFilenamePart(businessName, "business");
  const document = documentLabel
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const ext = extension.replace(/^\./, "");
  return `${business}-${document || "export"}.${ext}`;
}

export async function getBusinessNameForDownloads() {
  if (!hasSupabaseConfig()) return "Demo Business";
  try {
    const businessId = await getCurrentBusinessId();
    const { data } = await createClient()
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .maybeSingle();
    return data?.name?.trim() || "Business";
  } catch {
    return "Business";
  }
}
