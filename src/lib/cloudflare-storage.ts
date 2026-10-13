import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { R2Bucket, Fetcher } from "@cloudflare/workers-types";

export function cloudflareStorage() {
  // Plain `next dev` and `next start` continue to use the local content directory.
  let env;
  try { env = getCloudflareContext().env; }
  catch { return null; }
  const bindings = env as unknown as { CONTENT_BUCKET: R2Bucket; ASSETS: Fetcher };
  if (!bindings.CONTENT_BUCKET) throw new Error("Missing CONTENT_BUCKET binding");
  return bindings;
}
