-- Complète le "dossier" du formateur pour chaque étudiant/formation, en
-- répliquant fidèlement les 3 autres onglets du classeur Excel fourni par
-- la direction (en plus de road_maps = onglet "3-feuille de route") :
--   2-PAGE DE NOTE   -> grade_pages
--   1-RELEVÉ DE NOTE -> grade_transcripts
--   4-Compte rendu   -> course_reports
-- Même politique d'accès partout : le formateur (lecture-écriture sur ses
-- propres fiches), l'administration (lecture seule), l'étudiant (aucun accès).

create table if not exists public.grade_pages (
  id bigint generated always as identity primary key,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  formation_id bigint references public.formations(id) on delete set null,
  lieu_formation text,
  nombre_heures numeric,
  date_evaluation date,
  chapitre_evaluations jsonb not null default '[]'::jsonb,
  travaux_pratiques_total numeric default 0,
  travaux_pratiques_sur numeric default 60,
  examen_final_note numeric,
  examen_final_sur numeric default 40,
  moyenne numeric,
  note_finale numeric,
  supprime_le timestamptz,
  supprime_par uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grade_pages_instructor_idx on public.grade_pages(instructor_id);
create index if not exists grade_pages_student_idx on public.grade_pages(student_id);

create table if not exists public.grade_transcripts (
  id bigint generated always as identity primary key,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  formation_id bigint references public.formations(id) on delete set null,
  titre_cours text,
  evaluations_notees_note numeric,
  evaluations_notees_sur numeric default 60,
  examen_final_note numeric,
  examen_final_sur numeric default 40,
  total numeric,
  signature_formateur text,
  date_signature date,
  supprime_le timestamptz,
  supprime_par uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grade_transcripts_instructor_idx on public.grade_transcripts(instructor_id);
create index if not exists grade_transcripts_student_idx on public.grade_transcripts(student_id);

create table if not exists public.course_reports (
  id bigint generated always as identity primary key,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  formation_id bigint references public.formations(id) on delete set null,
  matiere_id bigint references public.matieres(id) on delete set null,
  date_rapport date,
  commentaires text,
  signature_formateur text,
  supprime_le timestamptz,
  supprime_par uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_reports_instructor_idx on public.course_reports(instructor_id);
create index if not exists course_reports_student_idx on public.course_reports(student_id);

drop trigger if exists grade_pages_updated_at on public.grade_pages;
create trigger grade_pages_updated_at
before update on public.grade_pages
for each row execute function public.road_maps_set_updated_at();

drop trigger if exists grade_transcripts_updated_at on public.grade_transcripts;
create trigger grade_transcripts_updated_at
before update on public.grade_transcripts
for each row execute function public.road_maps_set_updated_at();

drop trigger if exists course_reports_updated_at on public.course_reports;
create trigger course_reports_updated_at
before update on public.course_reports
for each row execute function public.road_maps_set_updated_at();

alter table public.grade_pages enable row level security;
create policy "grade_pages_select" on public.grade_pages
for select using (instructor_id = auth.uid() or public.is_admin());
create policy "grade_pages_insert_own" on public.grade_pages
for insert with check (public.is_instructor() and instructor_id = auth.uid());
create policy "grade_pages_update_own" on public.grade_pages
for update using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
create policy "grade_pages_delete_own" on public.grade_pages
for delete using (instructor_id = auth.uid());

alter table public.grade_transcripts enable row level security;
create policy "grade_transcripts_select" on public.grade_transcripts
for select using (instructor_id = auth.uid() or public.is_admin());
create policy "grade_transcripts_insert_own" on public.grade_transcripts
for insert with check (public.is_instructor() and instructor_id = auth.uid());
create policy "grade_transcripts_update_own" on public.grade_transcripts
for update using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
create policy "grade_transcripts_delete_own" on public.grade_transcripts
for delete using (instructor_id = auth.uid());

alter table public.course_reports enable row level security;
create policy "course_reports_select" on public.course_reports
for select using (instructor_id = auth.uid() or public.is_admin());
create policy "course_reports_insert_own" on public.course_reports
for insert with check (public.is_instructor() and instructor_id = auth.uid());
create policy "course_reports_update_own" on public.course_reports
for update using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
create policy "course_reports_delete_own" on public.course_reports
for delete using (instructor_id = auth.uid());
