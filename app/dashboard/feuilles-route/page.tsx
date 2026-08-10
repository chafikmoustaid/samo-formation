"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";

type FeuilleRoute = {
  id: number;
  instructor_id: string;
  student_id: string;
  formation_id: number | null;
  date_seance: string;
};

export default function AdminFeuillesDeRoutePage() {
  const [feuilles, setFeuilles] = useState<FeuilleRoute[]>([]);
  const [profils, setProfils] = useState<Map<string, string>>(new Map());
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [chargement, setChargement] = useState(true);

  const [filtreEtudiant, setFiltreEtudiant] = useState("");
  const [filtreFormateur, setFiltreFormateur] = useState("");
  const [filtreFormation, setFiltreFormation] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);

    const [{ data: feuillesData }, { data: profilsData }, { data: formationsData }] =
      await Promise.all([
        supabase
          .from("road_maps")
          .select("id, instructor_id, student_id, formation_id, date_seance")
          .is("supprime_le", null)
          .order("date_seance", { ascending: false }),
        supabase.from("profiles").select("id, nom_complet, email"),
        supabase.from("formations").select("id, nom"),
      ]);

    setFeuilles((feuillesData as FeuilleRoute[]) ?? []);
    setProfils(
      new Map(
        (profilsData ?? []).map((p) => [p.id as string, (p.nom_complet as string) ?? (p.email as string)])
      )
    );
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setChargement(false);
  }

  const etudiants = useMemo(
    () => Array.from(new Set(feuilles.map((f) => f.student_id))),
    [feuilles]
  );
  const formateurs = useMemo(
    () => Array.from(new Set(feuilles.map((f) => f.instructor_id))),
    [feuilles]
  );

  const feuillesFiltrees = feuilles.filter((f) => {
    if (filtreEtudiant && f.student_id !== filtreEtudiant) return false;
    if (filtreFormateur && f.instructor_id !== filtreFormateur) return false;
    if (filtreFormation && String(f.formation_id) !== filtreFormation) return false;
    return true;
  });

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Feuilles de route"
          subtitle="Consultation en lecture seule — la création et la modification se font par le formateur."
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
        />

        <DossierTabs admin />

        <Card>
          <div className="flex flex-wrap gap-3 mb-5">
            <select
              value={filtreEtudiant}
              onChange={(e) => setFiltreEtudiant(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous les étudiants</option>
              {etudiants.map((id) => (
                <option key={id} value={id}>
                  {profils.get(id) ?? id}
                </option>
              ))}
            </select>

            <select
              value={filtreFormateur}
              onChange={(e) => setFiltreFormateur(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous les formateurs</option>
              {formateurs.map((id) => (
                <option key={id} value={id}>
                  {profils.get(id) ?? id}
                </option>
              ))}
            </select>

            <select
              value={filtreFormation}
              onChange={(e) => setFiltreFormation(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Toutes les formations</option>
              {Array.from(formations.entries()).map(([id, nom]) => (
                <option key={id} value={id}>
                  {nom}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            {feuillesFiltrees.length} feuille(s) de route
          </p>

          {feuillesFiltrees.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune feuille de route trouvée.</p>
          ) : (
            <div className="divide-y">
              {feuillesFiltrees.map((f) => (
                <Link
                  key={f.id}
                  href={`/dashboard/feuilles-route/${f.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {profils.get(f.student_id) ?? "Étudiant"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {f.date_seance} — formateur : {profils.get(f.instructor_id) ?? "—"}
                      {f.formation_id ? ` — ${formations.get(f.formation_id) ?? ""}` : ""}
                    </p>
                  </div>
                  <span className="text-green-700 text-sm font-medium">Voir →</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
