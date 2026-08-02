// Palette de couleurs partagée pour les tuiles colorées (matières, boutons
// d'accès rapide, cartes de séance) — garde un rendu cohérent sur tous les
// portails (étudiant, formateur, administration) plutôt qu'une couleur
// choisie au cas par cas sur chaque page. Tons volontairement soutenus mais
// désaturés (registre "corporate") plutôt que des couleurs vives, pour un
// rendu professionnel plutôt que criard.
export const PALETTE_ACCUEIL = [
  "#1e3a5f", // bleu marine
  "#2f6690", // bleu acier
  "#0f6b5c", // sarcelle profond
  "#5b3a70", // prune
  "#8c4a2f", // terre cuite
  "#3d5a80", // bleu ardoise
  "#4a5759", // gris-vert graphite
  "#6b7a3f", // vert olive
];

export function couleurPalette(index: number): string {
  return PALETTE_ACCUEIL[((index % PALETTE_ACCUEIL.length) + PALETTE_ACCUEIL.length) % PALETTE_ACCUEIL.length];
}
