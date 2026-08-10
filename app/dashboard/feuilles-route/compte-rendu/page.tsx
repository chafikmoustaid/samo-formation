"use client";

import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";

type CompteRendu = {
  id: number;
  instructor_id: string;
  student_id: string;
  formation_id: number | null;
  date_rapport: string | null;
  commentaires: string | null;
};

export default function AdminCompteRenduPage() {
  const [comptesRendus, setComptesRendus] = useState<CompteRendu[]>([]);
  const [profils, setProfils] = useState<Map<string, string>>(new Map());
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [chargement, setChargement] = useState(true);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [filtreEtudiant, setFiltreEtudiant] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    const [{ data: comptesData }, { data: profilsData }, { data: formationsData }] = await Promise.all([
      supabase
        .from("course_reports")
        .select("id, instructor_id, student_id, formation_id, date_rapport, commentaires")
        .is("supprime_le", null)
        .order("date_rapport", { ascending: false }),
      supabase.from("profiles").select("id, nom_complet, email"),
      supabase.from("formations").select("id, nom"),
    ]);

    setComptesRendus((comptesData as CompteRendu[]) ?? []);
    setProfils(
      new Map((profilsData ?? []).map((p) => [p.id as string, (p.nom_complet as string) ?? (p.email as string)]))
    );
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setChargement(false);
  }

  const etudiants = useMemo(() => Array.from(new Set(comptesRendus.map((c) => c.student_id))), [comptesRendus]);
  const filtrees = comptesRendus.filter((c) => (filtreEtudiant ? c.student_id === filtreEtudiant : true));

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Feuilles de route"
          subtitle="Comptes rendus — lecture seule."
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
            <p className="text-gray-500 text-sm">Aucun compte rendu trouvé.</p>
          ) : (
            <div className="divide-y">
              {filtrees.map((c) => (
                <div key={c.id} className="py-3">
                  <button
                    onClick={() => setOuvert(ouvert === c.id ? null : c.id)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{profils.get(c.student_id) ?? "Étudiant"}</p>
                      <p className="text-sm text-gray-500">
                        {c.date_rapport ?? "—"} — formateur : {profils.get(c.instructor_id) ?? "—"}
                        {c.formation_id ? ` — ${formations.get(c.formation_id) ?? ""}` : ""}
                      </p>
                    </div>
                    <span className="text-green-700 text-sm font-medium">
                      {ouvert === c.id ? "Fermer ▲" : "Détails ▼"}
                    </span>
                  </button>
                  {ouvert === c.id && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                      {c.commentaires || "—"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
