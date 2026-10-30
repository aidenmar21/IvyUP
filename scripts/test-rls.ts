/**
 * Runs the Supabase migrations against an in-process Postgres (PGlite) with a
 * minimal stand-in for Supabase's auth and storage schemas, then checks the
 * Row Level Security rules that keep tutors, families, and the public apart.
 *
 *   npm run test:rls
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(),
  bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema public, auth to anon, authenticated;
`;

const GRANTS = `
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
`;

const OWNER = "00000000-0000-0000-0000-00000000000a";
const TUTOR_A_USER = "00000000-0000-0000-0000-00000000000b";
const TUTOR_B_USER = "00000000-0000-0000-0000-00000000000c";

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

async function main() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const dir = join(process.cwd(), "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  await db.exec(GRANTS);

  // Seed as superuser.
  await db.exec(`
    insert into auth.users values ('${OWNER}', 'owner@ivyup.org'),
      ('${TUTOR_A_USER}', 'a@tutors.ivyup.org'), ('${TUTOR_B_USER}', 'b@tutors.ivyup.org');
    insert into tutors (id, full_name, user_id, username) values
      ('10000000-0000-0000-0000-00000000000a', 'Ada Tutor', '${TUTOR_A_USER}', 'ada.tutor'),
      ('10000000-0000-0000-0000-00000000000b', 'Ben Tutor', '${TUTOR_B_USER}', 'ben.tutor');
    insert into profiles (id, role) values ('${OWNER}', 'owner');
    insert into profiles (id, role, username, tutor_id) values
      ('${TUTOR_A_USER}', 'tutor', 'ada.tutor', '10000000-0000-0000-0000-00000000000a'),
      ('${TUTOR_B_USER}', 'tutor', 'ben.tutor', '10000000-0000-0000-0000-00000000000b');
    insert into families (id, parent_name, parent_email, parent_phone) values
      ('20000000-0000-0000-0000-00000000000a', 'Parent A', 'pa@example.com', '555'),
      ('20000000-0000-0000-0000-00000000000b', 'Parent B', 'pb@example.com', '555'),
      ('20000000-0000-0000-0000-00000000000c', 'Parent C', 'pc@example.com', '555');
    insert into students (id, family_id, first_name, grade, stage, assigned_tutor_id) values
      ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Amy', '11', 'active', '10000000-0000-0000-0000-00000000000a'),
      ('30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'Bo', '10', 'active', '10000000-0000-0000-0000-00000000000b'),
      ('30000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-00000000000c', 'Cy', '9', 'new', null);
    insert into events (id, type, starts_at, ends_at, student_id, tutor_id) values
      ('40000000-0000-0000-0000-00000000000a', 'session', now(), now() + interval '1 hour', '30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a'),
      ('40000000-0000-0000-0000-00000000000b', 'session', now(), now() + interval '1 hour', '30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b'),
      ('40000000-0000-0000-0000-00000000000c', 'consultation', now(), now() + interval '30 min', '30000000-0000-0000-0000-00000000000c', null);
    insert into student_notes (student_id, body) values ('30000000-0000-0000-0000-00000000000a', 'Owner-only note');
    insert into tutor_private (tutor_id, hourly_wage, notes) values ('10000000-0000-0000-0000-00000000000a', 30, 'Owner-only');
    insert into testimonials (quote, attribution_name, result_type, status) values
      ('Posted', 'P', 'sat', 'posted'), ('Draft', 'D', 'sat', 'draft');
    insert into tutor_displays (name, description, status) values
      ('Posted', 'x', 'posted'), ('Draft', 'x', 'draft');
  `);

  async function as<T = Record<string, unknown>>(role: string, sub: string | null, sql: string) {
    await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false);`);
    try {
      return (await db.query<T>(sql)).rows;
    } finally {
      await db.exec(`reset role;`);
    }
  }
  async function asFails(role: string, sub: string | null, sql: string) {
    try {
      await as(role, sub, sql);
      return false;
    } catch {
      return true;
    }
  }

  // Anonymous visitors
  check("anon sees no students", (await as("anon", null, "select id from students")).length === 0);
  check("anon sees no families", (await as("anon", null, "select id from families")).length === 0);
  check("anon sees no applications", (await as("anon", null, "select id from tutor_applications")).length === 0);
  check("anon sees only posted testimonials",
    (await as<{ quote: string }>("anon", null, "select quote from testimonials")).map((r) => r.quote).join() === "Posted");
  check("anon sees only posted displays",
    (await as<{ name: string }>("anon", null, "select name from tutor_displays")).map((r) => r.name).join() === "Posted");
  check("anon cannot insert students",
    await asFails("anon", null, "insert into students (first_name, grade) values ('x', '9')"));

  // Owner
  check("owner sees all students", (await as("authenticated", OWNER, "select id from students")).length === 3);
  check("owner sees all events", (await as("authenticated", OWNER, "select id from events")).length === 3);
  check("owner sees drafts", (await as("authenticated", OWNER, "select id from testimonials")).length === 2);

  // Tutor A
  const aStudents = await as<{ first_name: string }>("authenticated", TUTOR_A_USER, "select first_name from students");
  check("tutor A sees only their student", aStudents.map((r) => r.first_name).join() === "Amy", aStudents);
  const aFamilies = await as<{ parent_name: string }>("authenticated", TUTOR_A_USER, "select parent_name from families");
  check("tutor A sees only their student's family", aFamilies.map((r) => r.parent_name).join() === "Parent A", aFamilies);
  const aEvents = await as<{ id: string }>("authenticated", TUTOR_A_USER, "select id from events");
  check("tutor A sees only their sessions", aEvents.length === 1 && aEvents[0].id.endsWith("a"), aEvents);
  check("tutor A sees one tutor record", (await as("authenticated", TUTOR_A_USER, "select id from tutors")).length === 1);
  check("tutor A cannot read applications", (await as("authenticated", TUTOR_A_USER, "select id from tutor_applications")).length === 0);
  check("tutor A cannot read contact messages", (await as("authenticated", TUTOR_A_USER, "select id from contact_messages")).length === 0);
  check("tutor A cannot change students",
    (await as("authenticated", TUTOR_A_USER, "update students set grade = '12' returning id")).length === 0);

  check("tutor A can add homework for own student",
    (await as("authenticated", TUTOR_A_USER, `insert into homework (student_id, tutor_id, description, due_date)
      values ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Ch 3', current_date) returning id`)).length === 1);
  check("tutor A cannot add homework for tutor B's student",
    await asFails("authenticated", TUTOR_A_USER, `insert into homework (student_id, tutor_id, description, due_date)
      values ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', 'x', current_date)`));
  check("tutor A cannot pose as tutor B",
    await asFails("authenticated", TUTOR_A_USER, `insert into homework (student_id, tutor_id, description, due_date)
      values ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'x', current_date)`));
  check("tutor A can write notes on own session",
    (await as("authenticated", TUTOR_A_USER, `insert into session_notes (event_id, occurrence_date, tutor_id, body)
      values ('40000000-0000-0000-0000-00000000000a', current_date, '10000000-0000-0000-0000-00000000000a', 'Good') returning id`)).length === 1);
  check("tutor A cannot write notes on B's session",
    await asFails("authenticated", TUTOR_A_USER, `insert into session_notes (event_id, occurrence_date, tutor_id, body)
      values ('40000000-0000-0000-0000-00000000000b', current_date, '10000000-0000-0000-0000-00000000000a', 'x')`));
  check("tutor A can reschedule own session",
    (await as("authenticated", TUTOR_A_USER, `update events set starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day'
      where id = '40000000-0000-0000-0000-00000000000a' returning id`)).length === 1);
  check("tutor A cannot reassign session to another student",
    await asFails("authenticated", TUTOR_A_USER, `update events set student_id = '30000000-0000-0000-0000-00000000000c'
      where id = '40000000-0000-0000-0000-00000000000a'`));
  check("tutor A cannot create a session for B's student",
    await asFails("authenticated", TUTOR_A_USER, `insert into events (type, starts_at, ends_at, student_id, tutor_id)
      values ('session', now(), now() + interval '1 hour', '30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a')`));

  check("tutor A cannot read owner notes on their student", (await as("authenticated", TUTOR_A_USER, "select * from student_notes")).length === 0);
  check("tutor A cannot read their own wage or owner notes", (await as("authenticated", TUTOR_A_USER, "select * from tutor_private")).length === 0);
  const cols = await as<{ column_name: string }>("authenticated", TUTOR_A_USER,
    "select column_name from information_schema.columns where table_schema = 'public' and table_name in ('students', 'tutors')");
  check("no private columns left on tables tutors can read",
    !cols.some((c) => ["owner_notes", "hourly_wage", "notes"].includes(c.column_name)), cols.map((c) => c.column_name));
  check("owner reads private notes", (await as("authenticated", OWNER, "select * from student_notes")).length === 1);
  check("owner reads tutor pay", (await as("authenticated", OWNER, "select * from tutor_private")).length === 1);

  // Tutor B sees none of A's homework
  check("tutor B cannot see A's homework", (await as("authenticated", TUTOR_B_USER, "select id from homework")).length === 0);

  // Archiving hides a student from the tutor
  await db.exec(`update students set stage = 'archived' where id = '30000000-0000-0000-0000-00000000000a'`);
  check("archived student is hidden from tutor", (await as("authenticated", TUTOR_A_USER, "select id from students")).length === 0);

  console.log(failures ? `\n${failures} check(s) failed` : "\nAll RLS checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
