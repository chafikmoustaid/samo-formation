-- Migration : pipeline d'import PPTX (fidèle / pédagogique / audit)
-- À exécuter manuellement dans Supabase > SQL Editor
-- (aucune clé service_role disponible pour l'exécuter automatiquement)

alter table course_lessons
  add column if not exists html_fidele text;

alter table course_lessons
  add column if not exists html_pedagogique text;

alter table course_lessons
  add column if not exists integrity_score integer default 0;

alter table course_lessons
  add column if not exists audit_report jsonb;

comment on column course_lessons.html_fidele is
  'HTML fidèle au PPTX original, généré par pptx-import/converter_v2.py';

comment on column course_lessons.html_pedagogique is
  'HTML mis en forme pédagogiquement (timeline, tableaux, placeholders), généré par pptx-import/converter_v2.py';

comment on column course_lessons.integrity_score is
  'Score d''intégrité 0-100 calculé par pptx-import/audit.py (pénalités sur PLACEHOLDER/TABLE/TIMELINE)';

comment on column course_lessons.audit_report is
  'Rapport JSON complet produit par pptx-import/audit.py (liste des slides spéciales détectées)';
