export type LigneFiche = {
  jour: string;
  type: "P" | "L";
  date: string;
  matiere: string;
  formationDe: string;
  formationA: string;
  pratiqueDe: string;
  pratiqueA: string;
};

export const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven"] as const;

export function creerLignesVides(): LigneFiche[] {
  const lignes: LigneFiche[] = [];

  JOURS.forEach((jour) => {
    (["P", "L"] as const).forEach((type) => {
      lignes.push({
        jour,
        type,
        date: "",
        matiere: "",
        formationDe: "",
        formationA: "",
        pratiqueDe: "",
        pratiqueA: "",
      });
    });
  });

  return lignes;
}

export function calculHeures(de: string, a: string): number {
  const deN = Number(de);
  const aN = Number(a);

  if (!de || !a || Number.isNaN(deN) || Number.isNaN(aN)) return 0;

  return Math.max(0, Number((aN - deN).toFixed(2)));
}

export function totalFormation(lignes: LigneFiche[]): number {
  return lignes.reduce(
    (sum, l) => sum + calculHeures(l.formationDe, l.formationA),
    0
  );
}

export function totalPratique(lignes: LigneFiche[]): number {
  return lignes.reduce(
    (sum, l) => sum + calculHeures(l.pratiqueDe, l.pratiqueA),
    0
  );
}

// Plage de dates réellement travaillées d'une fiche, déduite des lignes.
// À utiliser pour tout filtrage/export lié à la paie — la date de création
// de la fiche (created_at) ne reflète PAS les jours travaillés dedans (une
// fiche peut être créée/soumise plusieurs jours après la semaine couverte).
export function datesTravaillees(
  lignes: LigneFiche[]
): { debut: Date; fin: Date } | null {
  const dates = (lignes ?? [])
    .map((l) => l?.date)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return null;
  return { debut: dates[0], fin: dates[dates.length - 1] };
}

// Liste des heures sélectionnables (par demi-heure), utilisée pour les
// menus déroulants "De" / "À" du tableau de présence.
export const OPTIONS_HEURES: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [];

  for (let demiHeure = 0; demiHeure <= 47; demiHeure++) {
    const heure = Math.floor(demiHeure / 2);
    const minutes = demiHeure % 2 === 0 ? "00" : "30";
    const value = demiHeure % 2 === 0 ? String(heure) : `${heure}.5`;
    const label = `${String(heure).padStart(2, "0")}h${minutes}`;
    options.push({ value, label });
  }

  return options;
})();
