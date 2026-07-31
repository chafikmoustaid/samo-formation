// Extensions acceptées pour les pièces jointes de TP (ex. captures d'écran
// à l'appui d'une réponse). Restriction appliquée côté client uniquement —
// comme pour la protection du support de cours, ça décourage les erreurs
// et les usages non prévus, mais un utilisateur déterminé pourrait la
// contourner ; ce n'est pas une garantie de sécurité serveur.
export const EXTENSIONS_TP_ACCEPTEES = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "txt",
  "zip",
];

export const ACCEPT_TP_INPUT = EXTENSIONS_TP_ACCEPTEES.map((ext) => `.${ext}`).join(",");

export function extensionAutorisee(nomFichier: string): boolean {
  const extension = nomFichier.split(".").pop()?.toLowerCase();
  return !!extension && EXTENSIONS_TP_ACCEPTEES.includes(extension);
}
