"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";
import SelectRecherche from "@/components/ui/SelectRecherche";

type Evaluation = {
  id: number;
  instructor_id: string;
  student_id: string;
  matiere_id: number | null;
  formation_id: number | null;
  date_evaluation: string;
  seance: string | null;
  statut: "brouillon" | "soumise";
};

type Matiere = { id: number; nom: string };

const TAILLE_PAGE = 25;

export default function AdminEvaluationsHebdomadairesPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [profils, setProfils] = useState<Map<string, string>>(new Map());
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [matieres, setMatieres] = useState<Map<number, string>>(new Map());
  const [chargement, setChargement] = useState(true);

  const [recherche, setRecherche] = useState("");
  const [filtreEtudiant, setFiltreEtudiant] = useState("");
  const [filtreFormateur, setFiltreFormateur] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);

    const [
      { data: evaluationsData },
      { data: profilsData },
      { data: formationsData },
      { data: matieresData },
    ] = await Promise.all([
      supabase
        .from("weekly_evaluations")
        .select("id, instructor_id, student_id, matiere_id, formation_id, date_evaluation, seance, statut")
        .eq("statut", "soumise")
        .order("date_evaluation", { ascending: false }),
      supabase.from("profiles").select("id, nom_complet, email"),
      supabase.from("formations").select("id, nom"),
      supabase.from("matieres").select("id, nom"),
    ]);

    setEvaluations((evaluationsData as Evaluation[]) ?? []);
    setProfils(
      new Map(
        (profilsData ?? []).map((p) => [p.id as string, (p.nom_complet as string) ?? (p.email as string)])
      )
    );
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setMatieres(new Map((matieresData as Matiere[] ?? []).map((m) => [m.id, m.nom])));
    setChargement(false);
  }

  const etudiants = useMemo(
    () =>
      Array.from(new Set(evaluations.map((e) => e.student_id))).sort((a, b) =>
        (profils.get(a) ?? "").localeCompare(profils.get(b) ?? "")
      ),
    [evaluations, profils]
  );
  const formateurs = useMemo(
    () =>
      Array.from(new Set(evaluations.map((e) => e.instructor_id))).sort((a, b) =>
        (profils.get(a) ?? "").localeCompare(profils.get(b) ?? "")
      ),
    [evaluations, profils]
  );

  const rechercheNormalisee = recherche.trim().toLowerCase();

  const evaluationsFiltrees = useMemo(() => {
    return evaluations.filter((e) => {
      if (filtreEtudiant && e.student_id !== filtreEtudiant) return false;
      if (filtreFormateur && e.instructor_id !== filtreFormateur) return false;
      if (rechercheNormalisee) {
        const nomEtudiant = (profils.get(e.student_id) ?? "").toLowerCase();
        const nomFormateur = (profils.get(e.instructor_id) ?? "").toLowerCase();
        const nomMatiere = (e.matiere_id ? matieres.get(e.matiere_id) ?? "" : "").toLowerCase();
        if (
          !nomEtudiant.includes(rechercheNormalisee) &&
          !nomFormateur.includes(rechercheNormalisee) &&
          !nomMatiere.includes(rechercheNormalisee)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [evaluations, filtreEtudiant, filtreFormateur, rechercheNormalisee, profils, matieres]);

  const nbPages = Math.max(1, Math.ceil(evaluationsFiltrees.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const evaluationsPage = evaluationsFiltrees.slice(
    (pageCourante - 1) * TAILLE_PAGE,
    pageCourante * TAILLE_PAGE
  );

  const filtresActifs = !!recherche || !!filtreEtudiant || !!filtreFormateur;

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreEtudiant("");
    setFiltreFormateur("");
    setPage(1);
  }

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Évaluations hebdomadaires"
          subtitle="Consultation en lecture seule — soumises par les formateurs chaque vendredi."
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
        />

        <DossierTabs admin />

        <Card>
          <div className="mb-5 space-y-3">
            <input
              type="text"
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              placeholder="Rechercher un étudiant, un formateur ou une matière…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            />

            <div className="flex flex-wrap gap-3">
              <SelectRecherche
                value={filtreEtudiant}
                onChange={(v) => { setFiltreEtudiant(v); setPage(1); }}
                options={etudiants.map((id) => ({ value: id, label: profils.get(id) ?? id }))}
                optionTous="Tous les étudiants"
                placeholderRecherche="Rechercher un étudiant…"
                className="w-56"
              />

              <SelectRecherche
                value={filtreFormateur}
                onChange={(v) => { setFiltreFormateur(v); setPage(1); }}
                options={formateurs.map((id) => ({ value: id, label: profils.get(id) ?? id }))}
                optionTous="Tous les formateurs"
                placeholderRecherche="Rechercher un formateur…"
                className="w-56"
              />

              {filtresActifs && (
                <button
                  onClick={reinitialiserFiltres}
                  className="text-sm text-gray-500 hover:text-gray-700 underline px-1"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            {evaluationsFiltrees.length} évaluation(s)
            {nbPages > 1 ? ` — page ${pageCourante} sur ${nbPages}` : ""}
          </p>

          {evaluationsFiltrees.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune évaluation trouvée.</p>
          ) : (
            <>
              <div className="divide-y">
                {evaluationsPage.map((e) => (
                  <Link
                    key={e.id}
                    href={`/dashboard/weekly-evaluations/${e.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {profils.get(e.student_id) ?? "Étudiant"} —{" "}
                        {e.matiere_id ? matieres.get(e.matiere_id) ?? "Matière" : "—"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {e.date_evaluation}
                        {e.seance ? ` — Séance ${e.seance}` : ""} — formateur :{" "}
                        {profils.get(e.instructor_id) ?? "—"}
                        {e.formation_id ? ` — ${formations.get(e.formation_id) ?? ""}` : ""}
                      </p>
                    </div>
                    <span className="text-green-700 text-sm font-medium">Voir →</span>
                  </Link>
                ))}
              </div>

              {nbPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageCourante <= 1}
                    className="text-sm font-medium text-green-700 hover:text-green-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    ← Précédent
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {pageCourante} / {nbPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(nbPages, p + 1))}
                    disabled={pageCourante >= nbPages}
                    className="text-sm font-medium text-green-700 hover:text-green-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
