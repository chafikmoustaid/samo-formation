"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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

function exporterCsv(fiches: any[]) {
  const entetes = [
    "Étudiant",
    "Formateur",
    "Formation (h)",
    "Pratique (h)",
    "Total (h)",
    "Statut",
    "Créée le",
  ];

  const echapper = (valeur: unknown) => {
    const texte = String(valeur ?? "");
    return `"${texte.replace(/"/g, '""')}"`;
  };

  const lignes = fiches.map((f) =>
    [
      f.nom_etudiant,
      f.nom_formateur,
      f.total_formation ?? 0,
      f.total_pratique ?? 0,
      f.total_heures ?? 0,
      STATUT_LABELS[f.statut] ?? f.statut,
      f.created_at ? new Date(f.created_at).toLocaleDateString("fr-CA") : "",
    ]
      .map(echapper)
      .join(",")
  );

  const csv = "﻿" + [entetes.map(echapper).join(","), ...lignes].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fiches-presence-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceHistory() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [rechercheEtudiant, setRechercheEtudiant] = useState("");
  const [filtreFormateur, setFiltreFormateur] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [estAdmin, setEstAdmin] = useState(false);
  const [signatureEnregistree, setSignatureEnregistree] = useState<
    string | null
  >(null);
  const [selectionnees, setSelectionnees] = useState<Set<number>>(new Set());
  const [validationEnCours, setValidationEnCours] = useState(false);

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

  function toggleSelection(id: number) {
    setSelectionnees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function notifier(ficheId: number, type: "validee") {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ ficheId, type }),
    }).catch(() => {
      // La notification par courriel est non bloquante.
    });
  }

  async function validerSelection() {
    if (!signatureEnregistree || selectionnees.size === 0 || !userId) return;

    const confirmation = window.confirm(
      `Valider ${selectionnees.size} fiche(s) avec ta signature enregistrée ?`
    );
    if (!confirmation) return;

    setValidationEnCours(true);

    const ids = Array.from(selectionnees);

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

        if (!error) notifier(id, "validee");
      })
    );

    setValidationEnCours(false);
    setSelectionnees(new Set());
    chargerFiches();
  }

  const formateurs = useMemo(
    () =>
      Array.from(
        new Set(fiches.map((f) => f.nom_formateur).filter(Boolean))
      ).sort(),
    [fiches]
  );

  const fichesFiltrees = useMemo(() => {
    return fiches.filter((f) => {
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

      if (dateDebut && f.created_at) {
        if (new Date(f.created_at) < new Date(dateDebut)) return false;
      }

      if (dateFin && f.created_at) {
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
        if (new Date(f.created_at) > fin) return false;
      }

      return true;
    });
  }, [fiches, rechercheEtudiant, filtreFormateur, filtreStatut, dateDebut, dateFin]);

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
          title="Historique des fiches de présence"
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
          action={
            <Button
              variant="outline"
              onClick={() => exporterCsv(fichesFiltrees)}
              disabled={fichesFiltrees.length === 0}
            >
              Exporter en CSV
            </Button>
          }
        />

        <Card className="mb-6">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={rechercheEtudiant}
              onChange={(e) => setRechercheEtudiant(e.target.value)}
              placeholder="Rechercher un étudiant…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
            />

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
              <label className="text-sm text-gray-500">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="p-4 font-medium w-10"></th>
                  <th className="p-4 font-medium">Étudiant</th>
                  <th className="p-4 font-medium">Formateur</th>
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
                      {peutValider(fiche) && (
                        <input
                          type="checkbox"
                          checked={selectionnees.has(fiche.id)}
                          onChange={() => toggleSelection(fiche.id)}
                        />
                      )}
                    </td>
                    <td className="p-4">{fiche.nom_etudiant}</td>
                    <td className="p-4">{fiche.nom_formateur}</td>
                    <td className="p-4">{fiche.total_formation ?? 0} h</td>
                    <td className="p-4">{fiche.total_pratique ?? 0} h</td>
                    <td className="p-4">{fiche.total_heures} h</td>
                    <td className="p-4">
                      <Badge tone={STATUT_TONE[fiche.statut] ?? "neutral"}>
                        {STATUT_LABELS[fiche.statut] ?? fiche.statut}
                      </Badge>
                    </td>

                    <td className="p-4 space-x-2 whitespace-nowrap">
                      <Link
                        href={`/attendance/${fiche.id}`}
                        className="text-green-700 hover:underline"
                      >
                        Voir
                      </Link>

                      <DeleteAttendanceButton id={fiche.id} />
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
