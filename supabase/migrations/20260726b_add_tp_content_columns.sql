-- Ajoute le contenu structuré des TP (énoncé + corrigé) à la table assignments.
-- Permet d'afficher le TP complet à l'étudiant (contenu_html) et le corrigé
-- réservé au formateur (corrige_html), au lieu de la simple description
-- une ligne utilisée jusqu'ici.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS contenu_html text,
  ADD COLUMN IF NOT EXISTS corrige_html text;

COMMENT ON COLUMN assignments.contenu_html IS 'Énoncé complet du TP (HTML), affiché à l''étudiant.';
COMMENT ON COLUMN assignments.corrige_html IS 'Corrigé du TP (HTML), réservé au formateur.';
