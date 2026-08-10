"use client";

import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";

type Releve = {
  id: number;
  instructor_id: string;
  student_id: string;
  formation_id: number | null;
  titre_cours: string | null;
  evaluations_notees_note: number | null;
  evaluations_notees_sur: number;
  examen_final_note: number | null;
  examen_final_sur: number;
  total: number | null;
  date_signature: string | null;
};

export default function AdminReleveDeNotesPage() {
  const [releves, setReleves] = useState<Releve[]>([]);
  const [profils, setProfils] = useState<Map<string, string>>(new Map());
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [chargement, setChargement] = useState(true);
  const [filtreEtudiant, setFiltreEtudiant] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    const [{ data: relevesData }, { data: profilsData }, { data: formationsData }] = await Promise.all([
      supabase
        .from("grade_transcripts")
        .select(
          "id, instructor_id, student_id, formation_id, titre_cours, evaluations_notees_note, evaluations_notees_sur, examen_final_note, examen_final_sur, total, date_signature"
        )
        .is("supprime_le", null)
        .order("date_signature", { ascending: false }),
      supabase.from("profiles").select("id, nom_complet, email"),
      supabase.from("formations").select("id, nom"),
    ]);

    setReleves((relevesData as Releve[]) ?? []);
    setProfils(
      new Map((profilsData ?? []).map((p) => [p.id as string, (p.nom_complet as string) ?? (p.email as string)]))
    );
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setChargement(false);
  }

  const etudiants = useMemo(() => Array.from(new Set(releves.map((r) => r.student_id))), [releves]);
  const filtrees = releves.filter((r) => (filtreEtudiant ? r.student_id === filtreEtudiant : true));

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Feuilles de route"
          subtitle="Relevés de notes — lecture seule."
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
        />

        <DossierTabs admin />

        <Card>
          <select
            value={filtreEtudiant}
            onChange={(e) => setFiltreEtudiant(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white mb-5"
          >
            <option value="">Tous les étudiants</option>
            {etudiants.map((id) => (
              <option key={id} value={id}>
                {profils.get(id) ?? id}
              </option>
            ))}
          </select>

          {filtrees.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun relevé de notes trouvé.</p>
          ) : (
            <div className="divide-y">
              {filtrees.map((r) => (
                <div key={r.id} className="py-3">
                  <p className="font-medium text-gray-900">{profils.get(r.student_id) ?? "Étudiant"}</p>
                  <p className="text-sm text-gray-500">
                    {r.titre_cours} — formateur : {profils.get(r.instructor_id) ?? "—"}
                    {r.formation_id ? ` — ${formations.get(r.formation_id) ?? ""}` : ""}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Évaluations notées : {r.evaluations_notees_note ?? "—"}/{r.evaluations_notees_sur} — Examen final :{" "}
                    {r.examen_final_note ?? "—"}/{r.examen_final_sur} —{" "}
                    <span className="font-semibold text-green-800">Total : {r.total ?? "—"}/100</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
