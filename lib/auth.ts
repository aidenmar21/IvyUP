import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type Viewer = {
  userId: string;
  role: "owner" | "tutor";
  username: string | null;
  displayName: string | null;
  tutorId: string | null;
};

/** Reads the signed-in user and their role once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, display_name, tutor_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;
  return {
    userId,
    role: profile.role,
    username: profile.username,
    displayName: profile.display_name,
    tutorId: profile.tutor_id,
  };
});

export async function requireOwner() {
  const viewer = await getViewer();
  if (!viewer) redirect("/admin/login");
  if (viewer.role !== "owner") redirect(viewer.username ? `/tutor/${viewer.username}` : "/tutor/login");
  return viewer;
}

export async function requireTutor() {
  const viewer = await getViewer();
  if (!viewer) redirect("/tutor/login");
  if (viewer.role === "owner") redirect("/admin");
  if (!viewer.tutorId || !viewer.username) redirect("/tutor/login?error=inactive");
  return viewer as Viewer & { tutorId: string; username: string };
}

/** For server actions: returns null instead of redirecting so the UI can show an error. */
export async function ownerOrNull() {
  const viewer = await getViewer();
  return viewer?.role === "owner" ? viewer : null;
}

export async function tutorOrNull() {
  const viewer = await getViewer();
  return viewer?.role === "tutor" && viewer.tutorId ? (viewer as Viewer & { tutorId: string }) : null;
}
