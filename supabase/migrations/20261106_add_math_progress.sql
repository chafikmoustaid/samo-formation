-- Progression de l'Atelier Maths SN4 (/math) : une ligne par compte.
-- Accès uniquement via les routes API (clé service_role) : RLS activé et
-- volontairement aucune policy, donc rien n'est lisible depuis le navigateur.
create table if not exists public.math_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.math_progress enable row level security;

comment on table public.math_progress is
  'Progression de l''Atelier Maths SN4 (scores des quiz, problèmes, erreurs, plan de révision). Accès uniquement par les routes API /api/math/progress.';
