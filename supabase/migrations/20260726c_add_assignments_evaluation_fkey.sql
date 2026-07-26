-- assignments.evaluation_id n'avait aucune contrainte de clé étrangère vers
-- evaluations.id. Sans elle, PostgREST (utilisé par le client Supabase JS)
-- ne peut pas détecter automatiquement la relation pour les requêtes
-- imbriquées du type .select("*, assignments(*)") — la page
-- /instructor/tp/[id] retournait "Aucun TP publié" alors que les données
-- existaient bien.

ALTER TABLE assignments
  ADD CONSTRAINT assignments_evaluation_id_fkey
  FOREIGN KEY (evaluation_id) REFERENCES evaluations(id);
