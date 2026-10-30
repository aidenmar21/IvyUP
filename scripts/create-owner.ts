/**
 * Creates (or promotes) the owner login for the IvyUp dashboard.
 *
 *   npm run create-owner -- owner@ivyup.org "Owner Name"
 *
 * Prompts for a password. Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY
 * in .env.local.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

config({ path: ".env.local" });

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(" ") || "Owner";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!email) throw new Error('Usage: npm run create-owner -- you@ivyup.org "Your Name"');
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("Choose a password (12+ characters): ");
  rl.close();
  if (password.length < 12) throw new Error("Use at least 12 characters.");

  const admin = createClient(url, key, { auth: { persistSession: false } });

  let userId: string | undefined;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "owner", name } });
  if (created.error) {
    // Already exists: find the user and reset the password.
    const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw created.error;
    userId = existing.id;
    const { error: upErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (upErr) throw upErr;
  } else {
    userId = created.data.user.id;
  }

  const { error: pErr } = await admin.from("profiles").upsert({ id: userId, role: "owner", display_name: name });
  if (pErr) throw pErr;
  console.log(`\nOwner ready: ${email}\nSign in at /admin/login`);
}

main().catch((e) => {
  console.error(`\n${e.message ?? e}`);
  process.exit(1);
});
