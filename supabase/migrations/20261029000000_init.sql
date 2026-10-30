-- IvyUp schema: families, students, tutor applications, tutors, calendar,
-- homework, session notes, public tutor displays, testimonials, messages.
-- Row Level Security is enabled on every table. Public submissions are written
-- by the server with the service role after validation, so anon has no insert
-- rights anywhere.


-- ---------------------------------------------------------------------------
-- Profiles and role helpers
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'tutor')),
  username text unique,
  display_name text,
  tutor_id uuid,
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tutor_id from public.profiles where id = auth.uid() and role = 'tutor';
$$;

-- ---------------------------------------------------------------------------
-- Families and students
-- ---------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  parent_sms_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tutor_applications (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'interview_scheduled', 'hired', 'rejected')),
  full_name text not null,
  preferred_name text,
  email text not null,
  phone text not null,
  school text not null,
  year text not null,
  major text not null,
  semester_state text not null,
  time_zone text not null,
  subjects text[] not null default '{}',
  grade_levels text[] not null default '{}',
  sat_score text,
  act_score text,
  ap_scores text,
  weekly_availability text not null,
  max_hours_per_week integer not null,
  max_students integer not null,
  unavailable_periods text,
  summer_availability text,
  setup jsonb not null default '{}'::jsonb,
  prior_experience text not null,
  experience_details text,
  experience_with text[] not null default '{}',
  bio text not null,
  fun_fact text,
  answer_first_session text not null,
  answer_why_ivyup text not null,
  ack_adult boolean not null,
  ack_recorded boolean not null,
  ack_background_check boolean not null,
  ack_contractor boolean not null,
  ack_non_solicit boolean not null,
  referral_source text,
  anything_else text,
  owner_notes text,
  last_emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.tutor_applications (id) on delete set null,
  user_id uuid unique references auth.users (id) on delete set null,
  username text unique,
  full_name text not null,
  preferred_name text,
  email text,
  phone text,
  school text,
  grad_year text,
  major text,
  sat_score text,
  act_score text,
  ap_scores text,
  bio text,
  hourly_wage numeric(8, 2),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_tutor_fk foreign key (tutor_id) references public.tutors (id) on delete set null;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families (id) on delete set null,
  first_name text not null,
  grade text not null,
  phone text,
  email text,
  email_updates boolean not null default false,
  text_updates boolean not null default false,
  subjects text[] not null default '{}',
  ap_exams text[] not null default '{}',
  preferred_tutor text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'prospect', 'active', 'archived')),
  assigned_tutor_id uuid references public.tutors (id) on delete set null,
  consent_guardian boolean not null default false,
  consent_contact boolean not null default false,
  source text not null default 'form' check (source in ('form', 'manual')),
  owner_notes text,
  last_emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index students_stage_idx on public.students (stage, created_at desc);
create index students_tutor_idx on public.students (assigned_tutor_id);

-- ---------------------------------------------------------------------------
-- Calendar, homework, notes
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('consultation', 'interview', 'session')),
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  student_id uuid references public.students (id) on delete cascade,
  application_id uuid references public.tutor_applications (id) on delete cascade,
  tutor_id uuid references public.tutors (id) on delete set null,
  recurrence text not null default 'none' check (recurrence in ('none', 'weekly')),
  recurrence_until date,
  zoom_link text,
  location text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index events_starts_idx on public.events (starts_at);
create index events_tutor_idx on public.events (tutor_id);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  description text not null,
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index homework_student_due_idx on public.homework (student_id, due_date);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  occurrence_date date not null,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (event_id, occurrence_date)
);

-- ---------------------------------------------------------------------------
-- Public content
-- ---------------------------------------------------------------------------

create table public.tutor_displays (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid references public.tutors (id) on delete set null,
  name text not null,
  title text not null default 'Tutor',
  school text,
  description text not null,
  fun_fact text,
  photo_path text,
  photo_blurhash text,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  result_type text not null check (result_type in ('sat', 'act', 'psat', 'ap', 'other')),
  score_from integer,
  score_to integer,
  ap_exam text,
  ap_score integer check (ap_score between 1 and 5),
  result_text text,
  quote text not null,
  attribution_name text not null,
  attribution_role text not null default 'parent' check (attribution_role in ('parent', 'student')),
  tutor_name text,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Messages, email log, submission guard
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  topic text not null default 'general',
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  template text not null,
  student_id uuid references public.students (id) on delete set null,
  application_id uuid references public.tutor_applications (id) on delete set null,
  tutor_id uuid references public.tutors (id) on delete set null,
  provider_id text,
  status text not null default 'sent' check (status in ('sent', 'dev_outbox', 'failed')),
  error text,
  sent_at timestamptz not null default now()
);

create table public.submission_keys (
  key text primary key,
  kind text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index submission_keys_ip_idx on public.submission_keys (ip_hash, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.students enable row level security;
alter table public.tutor_applications enable row level security;
alter table public.tutors enable row level security;
alter table public.events enable row level security;
alter table public.homework enable row level security;
alter table public.session_notes enable row level security;
alter table public.tutor_displays enable row level security;
alter table public.testimonials enable row level security;
alter table public.contact_messages enable row level security;
alter table public.email_log enable row level security;
alter table public.submission_keys enable row level security;

-- Owner: full access everywhere.
create policy owner_all on public.profiles for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.families for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.students for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.tutor_applications for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.tutors for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.events for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.homework for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.session_notes for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.tutor_displays for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.testimonials for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.contact_messages for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.email_log for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- Everyone signed in can read their own profile row.
create policy self_read on public.profiles for select to authenticated using (id = auth.uid());

-- Tutors: their own tutor record, their students, and those students' families.
create policy tutor_self on public.tutors for select to authenticated
  using (id = public.current_tutor_id());

create policy tutor_students on public.students for select to authenticated
  using (stage = 'active' and assigned_tutor_id = public.current_tutor_id());

create policy tutor_families on public.families for select to authenticated
  using (exists (
    select 1 from public.students s
    where s.family_id = families.id
      and s.stage = 'active'
      and s.assigned_tutor_id = public.current_tutor_id()
  ));

-- Tutors: sessions they teach. They may create and reschedule sessions for
-- their own students, but cannot see consultations or interviews.
create policy tutor_events_read on public.events for select to authenticated
  using (type = 'session' and tutor_id = public.current_tutor_id());

create policy tutor_events_insert on public.events for insert to authenticated
  with check (
    type = 'session'
    and tutor_id = public.current_tutor_id()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.assigned_tutor_id = public.current_tutor_id()
    )
  );

create policy tutor_events_update on public.events for update to authenticated
  using (type = 'session' and tutor_id = public.current_tutor_id())
  with check (type = 'session' and tutor_id = public.current_tutor_id());

create policy tutor_events_delete on public.events for delete to authenticated
  using (type = 'session' and tutor_id = public.current_tutor_id());

-- Tutors: homework and notes for their own students.
create policy tutor_homework on public.homework for all to authenticated
  using (tutor_id = public.current_tutor_id())
  with check (
    tutor_id = public.current_tutor_id()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.assigned_tutor_id = public.current_tutor_id()
    )
  );

create policy tutor_notes on public.session_notes for all to authenticated
  using (tutor_id = public.current_tutor_id())
  with check (
    tutor_id = public.current_tutor_id()
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.tutor_id = public.current_tutor_id()
    )
  );

-- Public: posted displays and testimonials only.
create policy public_read_posted on public.tutor_displays for select to anon, authenticated
  using (status = 'posted');
create policy public_read_posted on public.testimonials for select to anon, authenticated
  using (status = 'posted');

-- submission_keys: service role only (no policies).

-- ---------------------------------------------------------------------------
-- Column guard: tutors may only change scheduling fields on their sessions.
-- ---------------------------------------------------------------------------

create or replace function public.guard_tutor_event_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_owner() or auth.uid() is null then
    return new;
  end if;
  if new.student_id is distinct from old.student_id
     or new.tutor_id is distinct from old.tutor_id
     or new.type is distinct from old.type
     or new.application_id is distinct from old.application_id then
    raise exception 'Tutors can only change the time, link, and notes of a session';
  end if;
  return new;
end;
$$;

create trigger guard_tutor_event_update
  before update on public.events
  for each row execute function public.guard_tutor_event_update();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_tutor_displays before update on public.tutor_displays
  for each row execute function public.touch_updated_at();
create trigger touch_testimonials before update on public.testimonials
  for each row execute function public.touch_updated_at();
create trigger touch_session_notes before update on public.session_notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: public bucket for tutor photos, owner-only writes
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-photos', 'tutor-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy tutor_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tutor-photos' and public.is_owner());
create policy tutor_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'tutor-photos' and public.is_owner());
create policy tutor_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tutor-photos' and public.is_owner());
