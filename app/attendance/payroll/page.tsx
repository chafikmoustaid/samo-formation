"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { datesTravaillees } from "@/lib/fichePresence";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const JOUR_MS = 24 * 60 * 60 * 1000;

function versISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function depuisISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

// Période de paie par défaut : les 14 derniers jours (incluant aujourd'hui).
// L'administration ajuste ensuite les dates au besoin — l'app n'impose pas
// de jour de départ fixe, seule la vraie date de début de paie compte.
function periodeParDefaut(): { debut: string; fin: string } {
  const fin = new Date();
  const debut = new Date(fin.getTime() - 13 * JOUR_MS);
  return { debut: versISO(debut), fin: versISO(fin) };
}

type Ligne = {
  nom: string;
  heuresValidees: number;
  fichesValidees: number;
  fichesEnAttente: number;
  fichesRefusees: number;
};

export default function PeriodePaiePage() {
  const defaut = periodeParDefaut();
  const [dateDebut, setDateDebut] = useState(defaut.debut);
  const [dateFin, setDateFin] = useState(defaut.fin);
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setLoading(true);

    const { data } = await supabase
      .from("attendance")
      .select(
        "id, nom_etudiant, nom_formateur, lignes, statut, total_heures"
      )
      .is("supprime_le", null);

    setFiches(data ?? []);
    setLoading(false);
  }

  function decaler(jours: number) {
    setDateDebut(versISO(new Date(depuisISO(dateDebut).getTime() + jours * JOUR_MS)));
    setDateFin(versISO(new Date(depuisISO(dateFin).getTime() + jours * JOUR_MS)));
  }

  const bornes = useMemo(() => {
    const debut = depuisISO(dateDebut);
    const fin = depuisISO(dateFin);
    return { debut, fin };
  }, [dateDebut, dateFin]);

  // Ne garde que les fiches dont la période travaillée chevauche la période
  // de paie sélectionnée — c'est la date de travail réelle qui doit
  // correspondre à la paie, pas la date de soumission de la fiche.
  const fichesDansPeriode = useMemo(() => {
    return fiches
      .map((f) => {
        const periode = datesTravaillees(Array.isArray(f.lignes) ? f.lignes : []);
        return { fiche: f, periode };
      })
      .filter(({ periode }) => {
        if (!periode) return false;
        return periode.debut <= bornes.fin && periode.fin >= bornes.debut;
      });
  }, [fiches, bornes]);

  const parEtudiant = useMemo(() => {
    const map = new Map<string, Ligne>();

    for (const { fiche } of fichesDansPeriode) {
      const nom = fiche.nom_etudiant || "Étudiant inconnu";
      const courant = map.get(nom) ?? {
        nom,
        heuresValidees: 0,
        fichesValidees: 0,
        fichesEnAttente: 0,
        fichesRefusees: 0,
      };

      if (fiche.statut === "validee") {
        courant.heuresValidees += Number(fiche.total_heures || 0);
        courant.fichesValidees += 1;
      } else if (fiche.statut === "en_attente") {
        courant.fichesEnAttente += 1;
      } else if (fiche.statut === "refusee") {
        courant.fichesRefusees += 1;
      }

      map.set(nom, courant);
    }

    return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [fichesDansPeriode]);

  const totalHeuresPeriode = parEtudiant.reduce(
    (somme, l) => somme + l.heuresValidees,
    0
  );

  const enAttenteCount = parEtudiant.reduce(
    (somme, l) => somme + l.fichesEnAttente,
    0
  );

  function exporterPaie() {
    const lignes = parEtudiant.map((l) => ({
      Étudiant: l.nom,
      "Heures validées": l.heuresValidees,
      "Fiches validées": l.fichesValidees,
      "Fiches en attente": l.fichesEnAttente,
    }));

    const feuille = XLSX.utils.json_to_sheet(lignes);
    feuille["!cols"] = [
      { wch: 22 }, // Étudiant
      { wch: 16 }, // Heures validées
      { wch: 16 }, // Fiches validées
      { wch: 16 }, // Fiches en attente
    ];

    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Période de paie");
    XLSX.writeFile(
      classeur,
      `periode-paie-${dateDebut}-au-${dateFin}.xlsx`
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Période de paie"
          backHref="/attendance/history"
          backLabel="← Retour à l'historique"
        />

        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Choisir la période
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Toutes les fiches dont les jours travaillés touchent cette
            période sont regroupées ci-dessous par étudiant(e).
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Du
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Au
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => decaler(-14)}>
                ← Période précédente
              </Button>
              <Button variant="outline" onClick={() => decaler(14)}>
                Période suivante →
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const d = periodeParDefaut();
                  setDateDebut(d.debut);
                  setDateFin(d.fin);
                }}
              >
                Aujourd&apos;hui
              </Button>
            </div>
          </div>
        </Card>

        {enAttenteCount > 0 && (
          <div className="mb-6 text-sm rounded-lg px-4 py-3 border bg-orange-50 border-orange-100 text-orange-700">
            {enAttenteCount} fiche(s) de cette période sont encore en
            attente de validation et ne sont donc pas comptées dans les
            heures ci-dessous. Valide-les d&apos;abord dans{" "}
            <Link href="/attendance/history" className="underline">
              l&apos;historique
            </Link>{" "}
            avant de finaliser la paie.
          </div>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Résumé par étudiant(e)
            </h2>
            <Button onClick={exporterPaie} disabled={parEtudiant.length === 0}>
              Exporter pour la paie (Excel)
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : parEtudiant.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucune fiche ne touche cette période.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="p-3 font-medium">Étudiant(e)</th>
                    <th className="p-3 font-medium">Heures validées</th>
                    <th className="p-3 font-medium">Fiches validées</th>
                    <th className="p-3 font-medium">En attente</th>
                  </tr>
                </thead>
                <tbody>
                  {parEtudiant.map((l) => (
                    <tr key={l.nom} className="border-b last:border-0">
                      <td className="p-3">{l.nom}</td>
                      <td className="p-3 font-semibold text-gray-900">
                        {l.heuresValidees} h
                      </td>
                      <td className="p-3">{l.fichesValidees}</td>
                      <td className="p-3">
                        {l.fichesEnAttente > 0 ? (
                          <Badge tone="warning">{l.fichesEnAttente}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t text-sm font-semibold text-gray-900">
                Total heures validées de la période : {totalHeuresPeriode} h
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
