"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";

type LigneChapitre = { nom: string; note: string; sur: string };

type PageDeNote = {
  id: number;
  instructor_id: string;
  student_id: string;
  formation_id: number | null;
  lieu_formation: string | null;
  nombre_heures: number | null;
  date_evaluation: string | null;
  chapitre_evaluations: LigneChapitre[];
  travaux_pratiques_total: number;
  travaux_pratiques_sur: number;
  examen_final_note: number | null;
  examen_final_sur: number;
  note_finale: number | null;
};

export default function AdminPageDeNotePage() {
  const [pages, setPages] = useState<PageDeNote[]>([]);
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
    const [{ data: pagesData }, { data: profilsData }, { data: formationsData }] = await Promise.all([
      supabase
        .from("grade_pages")
        .select(
          "id, instructor_id, student_id, formation_id, lieu_formation, nombre_heures, date_evaluation, chapitre_evaluations, travaux_pratiques_total, travaux_pratiques_sur, examen_final_note, examen_final_sur, note_finale"
        )
        .is("supprime_le", null)
        .order("date_evaluation", { ascending: false }),
      supabase.from("profiles").select("id, nom_complet, email"),
      supabase.from("formations").select("id, nom"),
    ]);

    setPages((pagesData as PageDeNote[]) ?? []);
    setProfils(
      new Map((profilsData ?? []).map((p) => [p.id as string, (p.nom_complet as string) ?? (p.email as string)]))
    );
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setChargement(false);
  }

  const etudiants = useMemo(() => Array.from(new Set(pages.map((p) => p.student_id))), [pages]);
  const filtrees = pages.filter((p) => (filtreEtudiant ? p.student_id === filtreEtudiant : true));

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Feuilles de route"
          subtitle="Pages de note — lecture seule."
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
            <p className="text-gray-500 text-sm">Aucune page de note trouvée.</p>
          ) : (
            <div className="divide-y">
              {filtrees.map((p) => (
                <div key={p.id} className="py-3">
                  <button
                    onClick={() => setOuvert(ouvert === p.id ? null : p.id)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{profils.get(p.student_id) ?? "Étudiant"}</p>
                      <p className="text-sm text-gray-500">
                        {p.date_evaluation ?? "—"} — formateur : {profils.get(p.instructor_id) ?? "—"}
                        {p.formation_id ? ` — ${formations.get(p.formation_id) ?? ""}` : ""}
                        {p.note_finale != null ? ` — Note finale : ${p.note_finale}/100` : ""}
                      </p>
                    </div>
                    <span className="text-green-700 text-sm font-medium">
                      {ouvert === p.id ? "Fermer ▲" : "Détails ▼"}
                    </span>
                  </button>

                  {ouvert === p.id && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm space-y-3">
                      <p>
                        <span className="font-semibold text-gray-600">Lieu :</span>{" "}
                        {p.lieu_formation || "—"} — <span className="font-semibold text-gray-600">Heures :</span>{" "}
                        {p.nombre_heures ?? "—"}
                      </p>
                      {p.chapitre_evaluations?.length > 0 && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="py-1">Évaluation de chapitre</th>
                              <th className="py-1">Note</th>
                              <th className="py-1">Sur</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.chapitre_evaluations.map((l, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1">{l.nom}</td>
                                <td className="py-1">{l.note}</td>
                                <td className="py-1">{l.sur}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <p>
                        Travaux pratiques : {p.travaux_pratiques_total}/{p.travaux_pratiques_sur} — Examen final :{" "}
                        {p.examen_final_note ?? "—"}/{p.examen_final_sur}
                      </p>
                      <p className="font-semibold text-green-800">
                        Note finale : {p.note_finale ?? "—"}/100
                      </p>
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
