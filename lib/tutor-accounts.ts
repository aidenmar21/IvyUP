import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TUTOR_LOGIN_DOMAIN } from "@/lib/env";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 16) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  // Group for readability when read aloud or copied by hand: xxxx-xxxx-xxxx-xxxx
  return out.match(/.{1,4}/g)!.join("-");
}

export function loginEmailFor(username: string) {
  return `${username}@${TUTOR_LOGIN_DOMAIN}`;
}

function slug(name: string) {
  return name
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);
}

async function uniqueUsername(admin: SupabaseClient, fullName: string) {
  const parts = slug(fullName);
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || "tutor").slice(0, 30);
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}${n + 1}`;
    const { data } = await admin.from("profiles").select("id").eq("username", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}${randomInt(1000, 9999)}`;
}

/**
 * Creates the Supabase login for a tutor and links it to their tutor record.
 * Tutors sign in with a username; the login email is an internal address so
 * Supabase never emails the tutor directly.
 */
export async function createTutorAccount(admin: SupabaseClient, tutor: { id: string; full_name: string }) {
  const username = await uniqueUsername(admin, tutor.full_name);
  const password = generatePassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: loginEmailFor(username),
    password,
    email_confirm: true,
    user_metadata: { role: "tutor", tutor_id: tutor.id, name: tutor.full_name },
  });
  if (error || !data.user) throw error ?? new Error("Could not create the login");

  const userId = data.user.id;
  const { error: pErr } = await admin.from("profiles").insert({
    id: userId,
    role: "tutor",
    username,
    display_name: tutor.full_name,
    tutor_id: tutor.id,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(userId);
    throw pErr;
  }
  const { error: tErr } = await admin.from("tutors").update({ user_id: userId, username }).eq("id", tutor.id);
  if (tErr) throw tErr;
  return { username, password };
}

export async function resetTutorPassword(admin: SupabaseClient, userId: string) {
  const password = generatePassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
  return password;
}

export async function setTutorLoginEnabled(admin: SupabaseClient, userId: string, enabled: boolean) {
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: enabled ? "none" : "876000h" });
  if (error) throw error;
}
