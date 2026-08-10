"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { LigneDeveloppement } from "@/lib/ficheDeveloppement";
import DeleteDevelopmentButton from "@/components/DeleteDevelopmentButton";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  validee: "Validée",
  refusee: "Refusée",
};

const STATUT_TONE: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  brouillon: "neutral",
  en_attente: "warning",
  validee: "success",
  refusee: "danger",
};

// Période (jour ou plage de jours) couverte par une fiche, déduite des
// dates renseignées dans ses lignes.
function periodeFiche(fiche: any): string {
  const lignes: LigneDeveloppement[] = Array.isArray(fiche.lignes) ? fiche.lignes : [];
  const dates = lignes
    .map((l) => l.date)
    .filter(Boolean)
    .sort();

  if (dates.length === 0) {
    return fiche.created_at
      ? new Date(fiche.created_at).toLocaleDateString("fr-CA")
      : "—";
  }

  const debut = new Date(`${dates[0]}T00:00:00`).toLocaleDateString("fr-CA");
  const fin = new Date(`${dates[dates.length - 1]}T00:00:00`).toLocaleDateString("fr-CA");

  return debut === fin ? debut : `${debut} au ${fin}`;
}

function exporterExcel(fiches: any[]) {
  const lignes = fiches.map((f) => ({
    Formateur: f.nom_formateur ?? "",
    Sujet: f.sujet ?? "",
    Semaine: periodeFiche(f),
    "Total (h)": Number(f.total_heures ?? 0),
    Statut: STATUT_LABELS[f.statut] ?? f.statut,
    "Créée le": f.created_at
      ? new Date(f.created_at).toLocaleDateString("fr-CA")
      : "",
  }));

  const feuille = XLSX.utils.json_to_sheet(lignes);
  feuille["!cols"] = [
    { wch: 18 }, // Formateur
    { wch: 30 }, // Sujet
    { wch: 22 }, // Semaine
    { wch: 10 }, // Total
    { wch: 12 }, // Statut
    { wch: 12 }, // Créée le
  ];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Fiches de développement");
  XLSX.writeFile(
    classeur,
    `fiches-developpement-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export default function DevelopmentHistoryPage() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [rechercheFormateur, setRechercheFormateur] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [voirCorbeille, setVoirCorbeille] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [restaurationEnCours, setRestaurationEnCours] = useState<number | null>(
    null
  );

  useEffect(() => {
    chargerFiches();
  }, []);

  // NOTE : cette liste est partagée entre formateurs et admins (RLS :
  // un formateur ne voit que ses propres fiches, un admin les voit
  // toutes). Ça veut dire qu'un admin voit ici aussi les brouillons
  // ("brouillon") des formateurs, pas seulement les fiches envoyées — même
  // comportement, non filtré, que app/attendance/history/page.tsx pour les
  // fiches de présence. Ce n'est pas corrigé ici volontairement : une vraie
  // solution demanderait soit un filtre explicite `statut != 'brouillon'`
  // pour les admins (au prix de compliquer les filtres existants), soit une
  // page dédiée comme séparent déjà student/attendance vs attendance/history
  // — à trancher en produit, pas à deviner ici.
  async function chargerFiches() {
    const { data, error } = await supabase
      .from("development_sheets")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    setFiches(data ?? []);
    setLoading(false);
  }

  async function restaurer(id: number) {
    setRestaurationEnCours(id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(`/api/development/${id}`, {
      method: "PATCH",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });

    setRestaurationEnCours(null);

    if (!response.ok) {
      alert("Erreur lors de la restauration");
      return;
    }

    chargerFiches();
  }

  const nbCorbeille = useMemo(
    () => fiches.filter((f) => f.supprime_le).length,
    [fiches]
  );

  const fichesFiltrees = useMemo(() => {
    return fiches.filter((f) => {
      if (voirCorbeille) {
        if (!f.supprime_le) return false;
      } else if (f.supprime_le) {
        return false;
      }

      if (
        rechercheFormateur.trim() &&
        !String(f.nom_formateur ?? "")
          .toLowerCase()
          .includes(rechercheFormateur.trim().toLowerCase())
      ) {
        return false;
      }

      if (filtreStatut && f.statut !== filtreStatut) return false;

      return true;
    });
  }, [fiches, voirCorbeille, rechercheFormateur, filtreStatut]);

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-red-600 text-xl font-bold">Erreur de chargement</h1>
        <pre className="mt-4 text-sm">{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={voirCorbeille ? "Corbeille" : "Fiches de développement"}
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
          action={
            <div className="flex items-center gap-3">
              <Link href="/development">
                <Button variant="primary">+ Nouvelle fiche</Button>
              </Link>

              <Button
                variant="outline"
                onClick={() => setVoirCorbeille((v) => !v)}
              >
                {voirCorbeille
                  ? "← Retour à la liste"
                  : `Voir la corbeille${nbCorbeille > 0 ? ` (${nbCorbeille})` : ""}`}
              </Button>

              {!voirCorbeille && (
                <Button
                  variant="outline"
                  onClick={() => exporterExcel(fichesFiltrees)}
                  disabled={fichesFiltrees.length === 0}
                >
                  Exporter en Excel
                </Button>
              )}
            </div>
          }
        />

        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={rechercheFormateur}
              onChange={(e) => setRechercheFormateur(e.target.value)}
              placeholder="Rechercher un(e) formateur(trice)…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-base flex-1 min-w-[220px]"
            />

            <Button variant="ghost" onClick={() => setFiltresOuverts((v) => !v)}>
              {filtresOuverts ? "Masquer les filtres" : "Plus de filtres"}
            </Button>
          </div>

          {filtresOuverts && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="en_attente">En attente</option>
                <option value="validee">Validée</option>
                <option value="refusee">Refusée</option>
              </select>

              {filtreStatut && (
                <Button variant="ghost" onClick={() => setFiltreStatut("")}>
                  Réinitialiser
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          {fichesFiltrees.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">
              Aucune fiche ne correspond à ces critères.
            </p>
          ) : (
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-sm">
                  <th className="p-4 font-medium">Formateur(trice)</th>
                  <th className="p-4 font-medium">Sujet</th>
                  <th className="p-4 font-medium">Semaine</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fichesFiltrees.map((fiche) => (
                  <tr key={fiche.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">
                      {fiche.nom_formateur}
                    </td>
                    <td className="p-4 max-w-xs truncate">{fiche.sujet}</td>
                    <td className="p-4 whitespace-nowrap text-gray-600">
                      {periodeFiche(fiche)}
                    </td>
                    <td className="p-4 font-semibold">{fiche.total_heures} h</td>
                    <td className="p-4">
                      <Badge tone={STATUT_TONE[fiche.statut] ?? "neutral"}>
                        {STATUT_LABELS[fiche.statut] ?? fiche.statut}
                      </Badge>
                    </td>
                    <td className="p-4 space-x-2 whitespace-nowrap">
                      {voirCorbeille ? (
                        <Button
                          size="sm"
                          onClick={() => restaurer(fiche.id)}
                          disabled={restaurationEnCours === fiche.id}
                        >
                          {restaurationEnCours === fiche.id
                            ? "Restauration..."
                            : "Restaurer"}
                        </Button>
                      ) : (
                        <>
                          <Link
                            href={`/development/${fiche.id}`}
                            className="text-green-700 hover:underline"
                          >
                            Voir
                          </Link>
                          <DeleteDevelopmentButton id={fiche.id} />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
