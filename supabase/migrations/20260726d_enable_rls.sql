-- Active RLS sur toutes les tables applicatives et ajoute des policies
-- adaptées aux rôles (admin / instructor / student) et à la propriété des
-- lignes. Auparavant, RLS était désactivé partout (accès libre via la clé
-- anonyme) — ce n'était pas grave tant que le site restait confidentiel,
-- mais maintenant que des comptes réels existent, on verrouille.

-- Fonctions utilitaires SECURITY DEFINER : elles s'exécutent avec les
-- privilèges du propriétaire de la fonction (qui bypass RLS), donc elles
-- peuvent lire profiles.role sans provoquer de récursion de policy.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'admin',
    false
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('admin', 'instructor'),
    false
  );
$$;

-- ============================================================
-- profiles
-- ============================================================
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin" on public.profiles
for insert with check (public.is_admin());

create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin());

create policy "profiles_delete_admin" on public.profiles
for delete using (public.is_admin());

-- ============================================================
-- attendance (fiches de présence)
-- ============================================================
alter table public.attendance enable row level security;

create policy "attendance_select" on public.attendance
for select using (user_id = auth.uid() or public.is_staff());

create policy "attendance_insert_own" on public.attendance
for insert with check (user_id = auth.uid());

create policy "attendance_update_staff" on public.attendance
for update using (public.is_staff());

create policy "attendance_delete_staff" on public.attendance
for delete using (public.is_staff());

-- ============================================================
-- assignment_submissions (remises de TP)
-- ============================================================
alter table public.assignment_submissions enable row level security;

create policy "submissions_select" on public.assignment_submissions
for select using (student_id = auth.uid() or public.is_staff());

create policy "submissions_insert_own" on public.assignment_submissions
for insert with check (student_id = auth.uid());

create policy "submissions_update_staff" on public.assignment_submissions
for update using (public.is_staff());

create policy "submissions_delete_staff" on public.assignment_submissions
for delete using (public.is_staff());

-- ============================================================
-- assignments (énoncés + corrigés de TP)
-- Note : RLS est du row-level, pas du column-level — corrige_html reste
-- techniquement dans la ligne. Le code applicatif étudiant ne sélectionne
-- plus cette colonne (voir app/student/assignments/page.tsx).
-- ============================================================
alter table public.assignments enable row level security;

create policy "assignments_select_auth" on public.assignments
for select using (auth.uid() is not null);

create policy "assignments_write_staff" on public.assignments
for insert with check (public.is_staff());

create policy "assignments_update_staff" on public.assignments
for update using (public.is_staff());

create policy "assignments_delete_staff" on public.assignments
for delete using (public.is_staff());

-- ============================================================
-- course_lessons (supports de cours pixel-perfect)
-- ============================================================
alter table public.course_lessons enable row level security;

create policy "course_lessons_select_auth" on public.course_lessons
for select using (auth.uid() is not null);

create policy "course_lessons_write_staff" on public.course_lessons
for insert with check (public.is_staff());

create policy "course_lessons_update_staff" on public.course_lessons
for update using (public.is_staff());

create policy "course_lessons_delete_staff" on public.course_lessons
for delete using (public.is_staff());

-- ============================================================
-- courses (ressources de cours)
-- ============================================================
alter table public.courses enable row level security;

create policy "courses_select_auth" on public.courses
for select using (auth.uid() is not null);

create policy "courses_write_staff" on public.courses
for insert with check (public.is_staff());

create policy "courses_update_staff" on public.courses
for update using (public.is_staff());

create policy "courses_delete_staff" on public.courses
for delete using (public.is_staff());

-- ============================================================
-- evaluations (métadonnées quiz/TP/examens)
-- ============================================================
alter table public.evaluations enable row level security;

create policy "evaluations_select_auth" on public.evaluations
for select using (auth.uid() is not null);

create policy "evaluations_write_staff" on public.evaluations
for insert with check (public.is_staff());

create policy "evaluations_update_staff" on public.evaluations
for update using (public.is_staff());

create policy "evaluations_delete_staff" on public.evaluations
for delete using (public.is_staff());

-- ============================================================
-- quiz_questions
-- Note : RLS ne masque pas la colonne bonne_reponse au sein d'une ligne
-- autorisée. La correction des quiz se fait aujourd'hui côté navigateur,
-- donc la bonne réponse est de toute façon envoyée au client avant
-- correction. C'est une limite d'architecture existante, pas quelque
-- chose que RLS peut résoudre seul (voir note transmise à l'utilisateur).
-- ============================================================
alter table public.quiz_questions enable row level security;

create policy "quiz_questions_select_auth" on public.quiz_questions
for select using (auth.uid() is not null);

create policy "quiz_questions_write_staff" on public.quiz_questions
for insert with check (public.is_staff());

create policy "quiz_questions_update_staff" on public.quiz_questions
for update using (public.is_staff());

create policy "quiz_questions_delete_staff" on public.quiz_questions
for delete using (public.is_staff());

-- ============================================================
-- quiz_results
-- ============================================================
alter table public.quiz_results enable row level security;

create policy "quiz_results_select" on public.quiz_results
for select using (user_id = auth.uid() or public.is_staff());

create policy "quiz_results_insert_own" on public.quiz_results
for insert with check (user_id = auth.uid());

create policy "quiz_results_update_staff" on public.quiz_results
for update using (public.is_staff());

create policy "quiz_results_delete_staff" on public.quiz_results
for delete using (public.is_staff());

-- ============================================================
-- exam_results
-- ============================================================
alter table public.exam_results enable row level security;

create policy "exam_results_select" on public.exam_results
for select using (user_id = auth.uid() or public.is_staff());

create policy "exam_results_insert_own" on public.exam_results
for insert with check (user_id = auth.uid());

create policy "exam_results_update_staff" on public.exam_results
for update using (public.is_staff());

create policy "exam_results_delete_staff" on public.exam_results
for delete using (public.is_staff());

-- ============================================================
-- sessions (référentiel des séances)
-- ============================================================
alter table public.sessions enable row level security;

create policy "sessions_select_auth" on public.sessions
for select using (auth.uid() is not null);

create policy "sessions_write_staff" on public.sessions
for insert with check (public.is_staff());

create policy "sessions_update_staff" on public.sessions
for update using (public.is_staff());

create policy "sessions_delete_staff" on public.sessions
for delete using (public.is_staff());

-- ============================================================
-- quiz_imports, users : non utilisées par l'application actuelle.
-- RLS activé, accès réservé à l'administration par prudence.
-- ============================================================
alter table public.quiz_imports enable row level security;

create policy "quiz_imports_admin_all" on public.quiz_imports
for all using (public.is_admin()) with check (public.is_admin());

alter table public.users enable row level security;

create policy "users_admin_all" on public.users
for all using (public.is_admin()) with check (public.is_admin());
