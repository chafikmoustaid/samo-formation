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
  matiere_id: number;
  formation_id: number | null;
  updated_at: string;
  nb_seances?: number;
};

type Matiere = { id: number; nom: string };

const TAILLE_PAGE = 25;

export default function AdminFeuillesDeRoutePage() {
  const [feuilles, setFeuilles] = useState<FeuilleRoute[]>([]);
  const [profils, setProfils] = useState<Map<string, string>>(new Map());
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [matieres, setMatieres] = useState<Map<number, string>>(new Map());
  const [chargement, setChargement] = useState(true);

  const [recherche, setRecherche] = useState("");
  const [filtreEtudiant, setFiltreEtudiant] = useState("");
  const [filtreFormateur, setFiltreFormateur] = useState("");
  const [filtreFormation, setFiltreFormation] = useState("");
  const [filtreMatiere, setFiltreMatiere] = useState("");
  const [filtreSeances, setFiltreSeances] = useState<"" | "avec" | "sans">("");
  const [tri, setTri] = useState<"recent" | "ancien" | "nom">("recent");
  const [page, setPage] = useState(1);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);

    const [
      { data: feuillesData },
      { data: profilsData },
      { data: formationsData },
      { data: matieresData },
      { data: entreesData },
    ] = await Promise.all([
      supabase
        .from("road_maps")
        .select("id, instructor_id, student_id, matiere_id, formation_id, updated_at")
        .order("updated_at", { ascending: false }),
      supabase.from("profiles").select("id, nom_complet, email"),
      supabase.from("formations").select("id, nom"),
      supabase.from("matieres").select("id, nom").order("nom", { ascending: true }),
      supabase.from("road_map_entries").select("road_map_id"),
    ]);

    const comptes = new Map<number, number>();
    (entreesData ?? []).forEach((e) => {
      comptes.set(e.road_map_id, (comptes.get(e.road_map_id) ?? 0) + 1);
    });

    setFeuilles(
      ((feuillesData as FeuilleRoute[]) ?? []).map((f) => ({
        ...f,
        nb_seances: comptes.get(f.id) ?? 0,
      }))
    );
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
      Array.from(new Set(feuilles.map((f) => f.student_id))).sort((a, b) =>
        (profils.get(a) ?? "").localeCompare(profils.get(b) ?? "")
      ),
    [feuilles, profils]
  );
  const formateurs = useMemo(
    () =>
      Array.from(new Set(feuilles.map((f) => f.instructor_id))).sort((a, b) =>
        (profils.get(a) ?? "").localeCompare(profils.get(b) ?? "")
      ),
    [feuilles, profils]
  );
  const matieresUtilisees = useMemo(
    () => Array.from(new Set(feuilles.map((f) => f.matiere_id))),
    [feuilles]
  );

  const rechercheNormalisee = recherche.trim().toLowerCase();

  const feuillesFiltrees = useMemo(() => {
    const resultat = feuilles.filter((f) => {
      if (filtreEtudiant && f.student_id !== filtreEtudiant) return false;
      if (filtreFormateur && f.instructor_id !== filtreFormateur) return false;
      if (filtreFormation && String(f.formation_id) !== filtreFormation) return false;
      if (filtreMatiere && String(f.matiere_id) !== filtreMatiere) return false;
      if (filtreSeances === "avec" && !(f.nb_seances ?? 0) ) return false;
      if (filtreSeances === "sans" && (f.nb_seances ?? 0) > 0) return false;
      if (rechercheNormalisee) {
        const nomEtudiant = (profils.get(f.student_id) ?? "").toLowerCase();
        const nomFormateur = (profils.get(f.instructor_id) ?? "").toLowerCase();
        const nomMatiere = (matieres.get(f.matiere_id) ?? "").toLowerCase();
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

    const tries = [...resultat];
    if (tri === "recent") {
      tries.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    } else if (tri === "ancien") {
      tries.sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? ""));
    } else {
      tries.sort((a, b) =>
        (profils.get(a.student_id) ?? "").localeCompare(profils.get(b.student_id) ?? "")
      );
    }
    return tries;
  }, [
    feuilles,
    filtreEtudiant,
    filtreFormateur,
    filtreFormation,
    filtreMatiere,
    filtreSeances,
    rechercheNormalisee,
    profils,
    matieres,
    tri,
  ]);

  const nbPages = Math.max(1, Math.ceil(feuillesFiltrees.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const feuillesPage = feuillesFiltrees.slice(
    (pageCourante - 1) * TAILLE_PAGE,
    pageCourante * TAILLE_PAGE
  );

  const filtresActifs =
    !!recherche || !!filtreEtudiant || !!filtreFormateur || !!filtreFormation || !!filtreMatiere || !!filtreSeances;

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreEtudiant("");
    setFiltreFormateur("");
    setFiltreFormation("");
    setFiltreMatiere("");
    setFiltreSeances("");
    setTri("recent");
    setPage(1);
  }

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
          <div className="mb-5 space-y-3">
            <input
              type="text"
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              placeholder="Rechercher un étudiant, un formateur ou une matière…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            />

            <div className="flex flex-wrap gap-3">
              <select
                value={filtreEtudiant}
                onChange={(e) => { setFiltreEtudiant(e.target.value); setPage(1); }}
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
                onChange={(e) => { setFiltreFormateur(e.target.value); setPage(1); }}
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
                onChange={(e) => { setFiltreFormation(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Toutes les formations</option>
                {Array.from(formations.entries()).map(([id, nom]) => (
                  <option key={id} value={id}>
                    {nom}
                  </option>
                ))}
              </select>

              <select
                value={filtreMatiere}
                onChange={(e) => { setFiltreMatiere(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Toutes les matières</option>
                {matieresUtilisees.map((id) => (
                  <option key={id} value={id}>
                    {matieres.get(id) ?? id}
                  </option>
                ))}
              </select>

              <select
                value={filtreSeances}
                onChange={(e) => { setFiltreSeances(e.target.value as "" | "avec" | "sans"); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Avec ou sans séance</option>
                <option value="avec">Avec au moins une séance</option>
                <option value="sans">Sans séance</option>
              </select>

              <select
                value={tri}
                onChange={(e) => { setTri(e.target.value as "recent" | "ancien" | "nom"); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="recent">Plus récentes d&apos;abord</option>
                <option value="ancien">Plus anciennes d&apos;abord</option>
                <option value="nom">Nom de l&apos;étudiant (A→Z)</option>
              </select>

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
            {feuillesFiltrees.length} feuille(s) de route
            {nbPages > 1 ? ` — page ${pageCourante} sur ${nbPages}` : ""}
          </p>

          {feuillesFiltrees.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune feuille de route trouvée.</p>
          ) : (
            <>
              <div className="divide-y">
                {feuillesPage.map((f) => (
                  <Link
                    key={f.id}
                    href={`/dashboard/feuilles-route/${f.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {profils.get(f.student_id) ?? "Étudiant"} —{" "}
                        {matieres.get(f.matiere_id) ?? "Matière"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {f.nb_seances ?? 0} séance{(f.nb_seances ?? 0) > 1 ? "s" : ""} — formateur :{" "}
                        {profils.get(f.instructor_id) ?? "—"}
                        {f.formation_id ? ` — ${formations.get(f.formation_id) ?? ""}` : ""}
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
