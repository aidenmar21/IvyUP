-- Owner-only fields move out of tables that tutors can read.
--
-- Tutors may read their assigned students and their own tutor record. Row
-- Level Security works per row, not per column, so the owner's private notes
-- on a student, and a tutor's wage and notes, live in owner-only tables.
-- Also lets the owner list and delete tutor photos in storage.

create table public.student_notes (
  student_id uuid primary key references public.students (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

create table public.tutor_private (
  tutor_id uuid primary key references public.tutors (id) on delete cascade,
  hourly_wage numeric(8, 2),
  notes text,
  updated_at timestamptz not null default now()
);

insert into public.student_notes (student_id, body)
select id, owner_notes from public.students where owner_notes is not null and owner_notes <> '';

insert into public.tutor_private (tutor_id, hourly_wage, notes)
select id, hourly_wage, notes from public.tutors;

alter table public.students drop column owner_notes;
alter table public.tutors drop column hourly_wage, drop column notes;

alter table public.student_notes enable row level security;
alter table public.tutor_private enable row level security;

create policy owner_all on public.student_notes for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.tutor_private for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create trigger touch_student_notes before update on public.student_notes
  for each row execute function public.touch_updated_at();
create trigger touch_tutor_private before update on public.tutor_private
  for each row execute function public.touch_updated_at();

-- Storage deletes need a matching select policy.
create policy tutor_photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'tutor-photos' and public.is_owner());
