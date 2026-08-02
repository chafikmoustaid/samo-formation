// Palette de couleurs partagée pour les tuiles colorées (matières, boutons
// d'accès rapide, cartes de séance) — garde un rendu cohérent sur tous les
// portails (étudiant, formateur, administration) plutôt qu'une couleur
// choisie au cas par cas sur chaque page.
export const PALETTE_ACCUEIL = [
  "#2563eb", // bleu
  "#7c3aed", // violet
  "#0d9488", // sarcelle
  "#4f46e5", // indigo
  "#db2777", // rose
  "#ea580c", // orange
  "#0891b2", // cyan
  "#65a30d", // vert olive
];

export function couleurPalette(index: number): string {
  return PALETTE_ACCUEIL[((index % PALETTE_ACCUEIL.length) + PALETTE_ACCUEIL.length) % PALETTE_ACCUEIL.length];
}
