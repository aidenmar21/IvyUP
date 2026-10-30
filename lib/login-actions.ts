"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { loginEmailFor } from "@/lib/tutor-accounts";

export type LoginState = { error?: string; identifier?: string };

function safeNext(next: FormDataEntryValue | null, prefix: string, fallback: string) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith(prefix) && !v.startsWith("//") ? v : fallback;
}

export async function ownerLogin(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("identifier") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", identifier: email };
  if (!isSupabaseConfigured()) return { error: "The database isn't connected yet. See README → Going live.", identifier: email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "That email and password don't match.", identifier: email };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "owner") {
    await supabase.auth.signOut();
    return { error: "This account doesn't have owner access. Tutors sign in at /tutor/login.", identifier: email };
  }
  redirect(safeNext(form.get("next"), "/admin", "/admin/prospects"));
}

export async function tutorLogin(_: LoginState, form: FormData): Promise<LoginState> {
  const identifier = String(form.get("identifier") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: "Enter your username and password.", identifier };
  if (!isSupabaseConfigured()) return { error: "Sign-in isn't available yet. Please try again later.", identifier };

  // Tutors sign in with their username. If they type their personal email,
  // look up the username that belongs to it.
  let username = identifier;
  if (identifier.includes("@")) {
    const { data: t } = await createAdminClient().from("tutors").select("username").eq("email", identifier).maybeSingle();
    if (!t?.username) return { error: "That username and password don't match.", identifier };
    username = t.username;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmailFor(username), password });
  if (error || !data.user) return { error: "That username and password don't match.", identifier };

  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "tutor" || !profile.username) {
    await supabase.auth.signOut();
    return { error: "This account isn't a tutor account.", identifier };
  }
  redirect(`/tutor/${profile.username}`);
}

export async function tutorSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/tutor/login");
}
