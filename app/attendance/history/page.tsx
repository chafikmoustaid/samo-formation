"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { datesTravaillees } from "@/lib/fichePresence";
import DeleteAttendanceButton from "@/components/DeleteAttendanceButton";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  validee: "Validée",
  refusee: "Refusée",
};

const STATUT_TONE: Record<string, "warning" | "success" | "danger"> = {
  en_attente: "warning",
  validee: "success",
  refusee: "danger",
};

// Déduit la période (semaine) couverte par une fiche à partir des dates
// renseignées dans ses lignes. C'est cette période — et non un total brut
// sans contexte — qui rend le relevé exploitable pour justifier des heures
// auprès de l'administration ou d'un organisme subventionnaire.
function periodeFiche(fiche: any): string {
  const plage = datesTravaillees(Array.isArray(fiche.lignes) ? fiche.lignes : []);

  if (!plage) {
    return fiche.created_at
      ? new Date(fiche.created_at).toLocaleDateString("fr-CA")
      : "—";
  }

  const debut = plage.debut.toLocaleDateString("fr-CA");
  const fin = plage.fin.toLocaleDateString("fr-CA");

  return debut === fin ? debut : `${debut} au ${fin}`;
}

// Export en vrai classeur Excel (.xlsx) plutôt qu'en CSV : le CSV, ouvert
// dans un Excel réglé en français, se fait mal découper en colonnes (Excel
// FR attend un point-virgule, pas une virgule, comme séparateur) et affiche
// les guillemets d'échappement en clair. Le .xlsx n'a pas ce problème — les
// colonnes, types de nombres et largeurs sont corrects dès l'ouverture.
function exporterExcel(fiches: any[]) {
  const lignes = fiches.map((f) => ({
    Étudiant: f.nom_etudiant ?? "",
    Formateur: f.nom_formateur ?? "",
    Semaine: periodeFiche(f),
    "Formation (h)": Number(f.total_formation ?? 0),
    "Pratique (h)": Number(f.total_pratique ?? 0),
    "Total (h)": Number(f.total_heures ?? 0),
    Statut: STATUT_LABELS[f.statut] ?? f.statut,
    "Créée le": f.created_at
      ? new Date(f.created_at).toLocaleDateString("fr-CA")
      : "",
  }));

  const feuille = XLSX.utils.json_to_sheet(lignes);
  feuille["!cols"] = [
    { wch: 18 }, // Étudiant
    { wch: 18 }, // Formateur
    { wch: 22 }, // Semaine
    { wch: 12 }, // Formation (h)
    { wch: 12 }, // Pratique (h)
    { wch: 10 }, // Total (h)
    { wch: 12 }, // Statut
    { wch: 12 }, // Créée le
  ];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Fiches de présence");
  XLSX.writeFile(
    classeur,
    `fiches-presence-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

function AttendanceHistoryContent() {
  const searchParams = useSearchParams();

  const [fiches, setFiches] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [rechercheEtudiant, setRechercheEtudiant] = useState(
    () => searchParams.get("etudiant") ?? ""
  );
  const [filtreFormateur, setFiltreFormateur] = useState("");
  const [filtreStatut, setFiltreStatut] = useState(
    () => searchParams.get("statut") ?? ""
  );
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [estAdmin, setEstAdmin] = useState(false);
  const [signatureEnregistree, setSignatureEnregistree] = useState<
    string | null
  >(null);
  const [selectionnees, setSelectionnees] = useState<Set<number>>(new Set());
  const [validationEnCours, setValidationEnCours] = useState(false);
  const [voirCorbeille, setVoirCorbeille] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [restaurationEnCours, setRestaurationEnCours] = useState<number | null>(
    null
  );

  useEffect(() => {
    chargerFiches();
    chargerProfil();
  }, []);

  async function chargerProfil() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data: profil } = await supabase
      .from("profiles")
      .select("role, signature_enregistree")
      .eq("id", user.id)
      .single();

    setEstAdmin(profil?.role === "admin");
    setSignatureEnregistree(profil?.signature_enregistree ?? null);
  }

  async function chargerFiches() {
    const { data, error } = await supabase
      .from("attendance")
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

  function peutValider(fiche: any) {
    return (
      fiche.statut === "en_attente" &&
      (estAdmin || fiche.formateur_id === userId || fiche.formateur_id === null)
    );
  }

  async function restaurer(id: number) {
    setRestaurationEnCours(id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(`/api/attendance/${id}`, {
      method: "PATCH",
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    setRestaurationEnCours(null);

    if (!response.ok) {
      alert("Erreur lors de la restauration");
      return;
    }

    chargerFiches();
  }

  function toggleSelection(id: number) {
    setSelectionnees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Renvoie true si le courriel a bien été envoyé (ou volontairement
  // ignoré), false en cas d'échec réel. L'échec n'empêche jamais la
  // validation de la fiche, seulement l'avis par courriel à l'étudiant(e).
  async function notifier(ficheId: number, type: "validee"): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const reponse = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ ficheId, type }),
      });

      const resultat = await reponse.json().catch(() => null);
      return Boolean(resultat?.success);
    } catch {
      return false;
    }
  }

  async function validerSelection() {
    if (!signatureEnregistree || selectionnees.size === 0 || !userId) return;

    // On liste explicitement qui va être validé — un simple compte de
    // fiches ne permet pas de repérer une erreur de sélection avant de
    // signer en lot, ce qui serait risqué pour des données utilisées en
    // paie.
    const ids = Array.from(selectionnees);
    const recap = ids
      .map((id) => {
        const fiche = fiches.find((f) => f.id === id);
        if (!fiche) return `Fiche #${id}`;
        return `• ${fiche.nom_etudiant} — ${periodeFiche(fiche)} (${fiche.total_heures ?? 0} h)`;
      })
      .join("\n");

    const confirmation = window.confirm(
      `Tu es sur le point de valider ${ids.length} fiche(s) avec ta signature enregistrée :\n\n${recap}\n\nConfirmer ?`
    );
    if (!confirmation) return;

    setValidationEnCours(true);

    const echecsNotification: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const fiche = fiches.find((f) => f.id === id);
        const { error } = await supabase
          .from("attendance")
          .update({
            signature_formateur: signatureEnregistree,
            date_signature_formateur: new Date().toISOString(),
            formateur_id: fiche?.formateur_id ?? userId,
            statut: "validee",
            motif: null,
          })
          .eq("id", id);

        if (!error) {
          const ok = await notifier(id, "validee");
          if (!ok) echecsNotification.push(fiche?.nom_etudiant || `Fiche #${id}`);
        }
      })
    );

    setValidationEnCours(false);
    setSelectionnees(new Set());
    chargerFiches();

    if (echecsNotification.length > 0) {
      window.alert(
        `Fiche(s) validée(s), mais le courriel d'avis n'a pas pu être envoyé pour : ${echecsNotification.join(
          ", "
        )}. Pense à prévenir ces étudiant(e)s autrement.`
      );
    }
  }

  const formateurs = useMemo(
    () =>
      Array.from(
        new Set(fiches.map((f) => f.nom_formateur).filter(Boolean))
      ).sort(),
    [fiches]
  );

  const nbCorbeille = useMemo(
    () => fiches.filter((f) => f.supprime_le).length,
    [fiches]
  );

  const fichesFiltrees = useMemo(() => {
    return fiches.filter((f) => {
      // Vue normale = fiches actives seulement. Vue corbeille = uniquement
      // celles mises à la corbeille, pour pouvoir les restaurer.
      if (voirCorbeille) {
        if (!f.supprime_le) return false;
      } else if (f.supprime_le) {
        return false;
      }

      if (
        rechercheEtudiant.trim() &&
        !String(f.nom_etudiant ?? "")
          .toLowerCase()
          .includes(rechercheEtudiant.trim().toLowerCase())
      ) {
        return false;
      }

      if (filtreFormateur && f.nom_formateur !== filtreFormateur) return false;
      if (filtreStatut && f.statut !== filtreStatut) return false;

      if (dateDebut || dateFin) {
        // Important pour la paie : on filtre sur les jours réellement
        // travaillés (déduits des lignes de la fiche), pas sur la date de
        // création/soumission — une fiche soumise en retard doit quand
        // même apparaître dans la période où le travail a eu lieu. Si la
        // fiche n'a aucune date exploitable dans ses lignes, on retombe
        // sur la date de création à défaut de mieux.
        const plage = datesTravaillees(
          Array.isArray(f.lignes) ? f.lignes : []
        );
        const debutFiche = plage?.debut ?? (f.created_at ? new Date(f.created_at) : null);
        const finFiche = plage?.fin ?? (f.created_at ? new Date(f.created_at) : null);

        if (dateDebut) {
          const debutFiltre = new Date(dateDebut);
          if (!finFiche || finFiche < debutFiltre) return false;
        }

        if (dateFin) {
          const finFiltre = new Date(dateFin);
          finFiltre.setHours(23, 59, 59, 999);
          if (!debutFiche || debutFiche > finFiltre) return false;
        }
      }

      return true;
    });
  }, [
    fiches,
    voirCorbeille,
    rechercheEtudiant,
    filtreFormateur,
    filtreStatut,
    dateDebut,
    dateFin,
  ]);

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-red-600 text-xl font-bold">
          Erreur de chargement
        </h1>

        <pre className="mt-4 text-sm">{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={voirCorbeille ? "Corbeille" : "Historique des fiches de présence"}
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
          action={
            <div className="flex items-center gap-3">
              {!voirCorbeille && (
                <Link href="/attendance/payroll">
                  <Button variant="primary">Période de paie</Button>
                </Link>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setVoirCorbeille((v) => !v);
                  setSelectionnees(new Set());
                }}
              >
                {voirCorbeille
                  ? "← Retour à l'historique"
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

        <p className="text-sm text-gray-500 mb-4">
          Toutes les fiches de présence envoyées par les étudiant(e)s
          apparaissent ici. Utilise la recherche pour trouver rapidement
          quelqu&apos;un, ou ouvre les filtres pour affiner par formateur,
          statut ou période.
        </p>

        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={rechercheEtudiant}
              onChange={(e) => setRechercheEtudiant(e.target.value)}
              placeholder="Rechercher un étudiant…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-base flex-1 min-w-[220px]"
            />

            <Button
              variant="ghost"
              onClick={() => setFiltresOuverts((v) => !v)}
            >
              {filtresOuverts ? "Masquer les filtres" : "Plus de filtres"}
            </Button>
          </div>

          {filtresOuverts && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
              <select
                value={filtreFormateur}
                onChange={(e) => setFiltreFormateur(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tous les formateurs</option>
                {formateurs.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="validee">Validée</option>
                <option value="refusee">Refusée</option>
              </select>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Travaillé du</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">au</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {(filtreFormateur || filtreStatut || dateDebut || dateFin) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFiltreFormateur("");
                    setFiltreStatut("");
                    setDateDebut("");
                    setDateFin("");
                  }}
                >
                  Réinitialiser
                </Button>
              )}

              <p className="w-full text-xs text-gray-400">
                Le filtre de dates porte sur les journées réellement
                travaillées inscrites sur la fiche — pas sur sa date de
                soumission.
              </p>
            </div>
          )}
        </Card>

        {selectionnees.size > 0 && (
          <Card className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700">
              {selectionnees.size} fiche(s) sélectionnée(s)
            </p>
            <div className="flex items-center gap-3">
              {!signatureEnregistree && (
                <p className="text-xs text-gray-400">
                  Signe et mémorise ta signature depuis une fiche pour activer la validation groupée.
                </p>
              )}
              <Button
                onClick={validerSelection}
                disabled={!signatureEnregistree || validationEnCours}
              >
                {validationEnCours ? "Validation…" : "Valider la sélection"}
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-0 overflow-hidden">
          {fichesFiltrees.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">
              Aucune fiche ne correspond à ces critères.
            </p>
          ) : (
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-sm">
                  <th className="p-4 font-medium w-10"></th>
                  <th className="p-4 font-medium">Étudiant</th>
                  <th className="p-4 font-medium">Formateur</th>
                  <th className="p-4 font-medium">Semaine</th>
                  <th className="p-4 font-medium">Formation</th>
                  <th className="p-4 font-medium">Pratique</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {fichesFiltrees.map((fiche) => (
                  <tr key={fiche.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      {!voirCorbeille && peutValider(fiche) && (
                        <input
                          type="checkbox"
                          checked={selectionnees.has(fiche.id)}
                          onChange={() => toggleSelection(fiche.id)}
                          className="h-4 w-4"
                        />
                      )}
                    </td>
                    <td className="p-4 font-medium text-gray-900">{fiche.nom_etudiant}</td>
                    <td className="p-4">{fiche.nom_formateur}</td>
                    <td className="p-4 whitespace-nowrap text-gray-600">
                      {periodeFiche(fiche)}
                    </td>
                    <td className="p-4">{fiche.total_formation ?? 0} h</td>
                    <td className="p-4">{fiche.total_pratique ?? 0} h</td>
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
                            ? "Restauration…"
                            : "Restaurer"}
                        </Button>
                      ) : (
                        <>
                          <Link
                            href={`/attendance/${fiche.id}`}
                            className="inline-flex items-center justify-center bg-white hover:bg-green-50 text-green-700 border border-green-600 px-3 py-2 rounded font-medium"
                          >
                            Voir
                          </Link>

                          <DeleteAttendanceButton id={fiche.id} />
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

export default function AttendanceHistory() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Chargement...</div>}>
      <AttendanceHistoryContent />
    </Suspense>
  );
}
