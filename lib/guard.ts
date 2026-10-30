import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const HOURLY_LIMIT: Record<string, number> = { signup: 8, application: 4, contact: 6 };

async function clientIpHash() {
  const h = await headers();
  const ip =
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  return createHash("sha256").update(`ivyup:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Claims an idempotency key for a public submission and enforces a per-IP
 * hourly limit. Returns "duplicate" when this exact submission already went
 * through (a double click or a retried request), so callers can report
 * success without writing twice.
 */
export async function claimSubmission(
  db: SupabaseClient,
  kind: keyof typeof HOURLY_LIMIT,
  key: string,
): Promise<"ok" | "duplicate" | "rate_limited"> {
  const ipHash = await clientIpHash();
  const { data: existing } = await db.from("submission_keys").select("key").eq("key", key).maybeSingle();
  if (existing) return "duplicate";

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("submission_keys")
    .select("key", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("kind", kind)
    .gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT[kind]) return "rate_limited";

  const { error } = await db.from("submission_keys").insert({ key, kind, ip_hash: ipHash });
  if (error?.code === "23505") return "duplicate";
  if (error) throw error;
  return "ok";
}

export async function releaseSubmission(db: SupabaseClient, key: string) {
  await db.from("submission_keys").delete().eq("key", key);
}
