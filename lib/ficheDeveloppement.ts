// Liste fixe des personnes habilitées à approuver une période de
// développement (reprend le menu déroulant du formulaire papier d'origine).
export const APPROBATEURS_DEVELOPPEMENT = [
  "Anis Soussi",
  "Denis Gauthier",
  "Jacqueline Bell",
  "Marie-Michèle",
  "Véronique Bell",
] as const;

export type LigneDeveloppement = {
  date: string;
  heureDebut: string;
  heureFin: string;
};

export function ligneDeveloppementVide(): LigneDeveloppement {
  return { date: "", heureDebut: "", heureFin: "" };
}

export function calculHeuresLigne(ligne: LigneDeveloppement): number {
  const debut = Number(ligne.heureDebut);
  const fin = Number(ligne.heureFin);

  if (!ligne.heureDebut || !ligne.heureFin || Number.isNaN(debut) || Number.isNaN(fin)) {
    return 0;
  }

  return Math.max(0, Number((fin - debut).toFixed(2)));
}

export function totalHeuresDeveloppement(lignes: LigneDeveloppement[]): number {
  return lignes.reduce((somme, l) => somme + calculHeuresLigne(l), 0);
}

// Lundi (00:00) de la semaine ISO contenant la date donnée.
function lundiDeLaSemaine(date: Date): Date {
  const d = new Date(date);
  const jour = d.getDay(); // 0 = dimanche ... 6 = samedi
  const decalage = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + decalage);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Toutes les lignes ayant une date doivent tomber dans la même semaine
// (lundi à dimanche) que la première ligne datée — une fiche de
// développement peut couvrir plusieurs journées, mais toujours d'une
// seule et même semaine, pour rester cohérente avec une seule période
// d'autorisation/approbation.
export function lignesDansLaMemeSemaine(lignes: LigneDeveloppement[]): boolean {
  const dates = lignes
    .map((l) => l.date)
    .filter((d): d is string => !!d)
    .map((d) => new Date(`${d}T00:00:00`))
    .filter((d) => !Number.isNaN(d.getTime()));

  if (dates.length <= 1) return true;

  const semaineReference = lundiDeLaSemaine(dates[0]).getTime();

  return dates.every((d) => lundiDeLaSemaine(d).getTime() === semaineReference);
}

// Liste des heures sélectionnables (par demi-heure) pour les menus "De" / "À".
export const OPTIONS_HEURES_DEV: { value: string; label: string }[] = (() => {
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
