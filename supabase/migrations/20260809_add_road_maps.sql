-- Feuilles de route : suivi détaillé par séance, par étudiant et par
-- formation/matière, rempli par le formateur (lecture-écriture) et visible
-- par l'administration en lecture seule. L'étudiant n'y a jamais accès,
-- exactement comme l'indiquait le modèle Excel fourni ("vous ne devez pas
-- mettre les feuilles de route dans le dossier Teams de l'étudiant").

create table if not exists public.road_maps (
  id bigint generated always as identity primary key,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id bigint references public.sessions(id) on delete set null,
  formation_id bigint references public.formations(id) on delete set null,
  matiere_id bigint references public.matieres(id) on delete set null,
  date_seance date not null,
  heure_debut time,
  heure_fin time,
  theorie_donnee text,
  pratiques_exercices text,
  evaluations_notees text,
  notes text,
  supprime_le timestamptz,
  supprime_par uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.road_maps is 'Feuilles de route : suivi détaillé par séance/étudiant/formation, rempli par le formateur (lecture-écriture), consultable par l''administration en lecture seule. Inspiré du modèle Excel "FEUILLE DE ROUTE" fourni par la direction.';

create index if not exists road_maps_instructor_idx on public.road_maps(instructor_id);
create index if not exists road_maps_student_idx on public.road_maps(student_id);
create index if not exists road_maps_session_idx on public.road_maps(session_id);
create index if not exists road_maps_formation_idx on public.road_maps(formation_id);

create or replace function public.road_maps_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists road_maps_updated_at on public.road_maps;
create trigger road_maps_updated_at
before update on public.road_maps
for each row execute function public.road_maps_set_updated_at();

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'instructor',
    false
  );
$$;

alter table public.road_maps enable row level security;

create policy "road_maps_select" on public.road_maps
for select using (instructor_id = auth.uid() or public.is_admin());

create policy "road_maps_insert_own" on public.road_maps
for insert with check (public.is_instructor() and instructor_id = auth.uid());

create policy "road_maps_update_own" on public.road_maps
for update using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create policy "road_maps_delete_own" on public.road_maps
for delete using (instructor_id = auth.uid());
