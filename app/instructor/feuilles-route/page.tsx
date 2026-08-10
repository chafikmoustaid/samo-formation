"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import DossierTabs from "@/components/instructor/DossierTabs";

type Etudiant = {
  id: string;
  nom_complet: string | null;
  email: string;
  formation_id: number | null;
};

type Matiere = { id: number; nom: string };

type FeuilleRoute = {
  id: number;
  student_id: string;
  matiere_id: number;
  formation_id: number | null;
  instructor_id: string;
  updated_at: string;
  nb_seances?: number;
};

export default function FeuillesDeRoutePage() {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matieresParFormation, setMatieresParFormation] = useState<Map<number, number[]>>(new Map());
  const [matieresDuFormateur, setMatieresDuFormateur] = useState<Set<number>>(new Set());
  const [feuilles, setFeuilles] = useState<FeuilleRoute[]>([]);
  const [instructorId, setInstructorId] = useState<string | null>(null);

  // Formulaire de création
  const [etudiantId, setEtudiantId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [creation, setCreation] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "succes" | "erreur" } | null>(null);

  // Filtre de la liste
  const [filtreEtudiant, setFiltreEtudiant] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setChargement(false);
      return;
    }
    setInstructorId(user.id);

    const { data: profil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let formationIds: number[] | null = null;
    if (profil?.role !== "admin") {
      const { data: assignations } = await supabase
        .from("instructor_formations")
        .select("formation_id")
        .eq("profil_id", user.id);
      formationIds = (assignations ?? []).map((a) => a.formation_id);
    }

    let requeteEtudiants = supabase
      .from("profiles")
      .select("id, nom_complet, email, formation_id")
      .eq("role", "student")
      .order("nom_complet", { ascending: true });
    if (formationIds !== null) {
      requeteEtudiants = requeteEtudiants.in("formation_id", formationIds);
    }

    const [
      { data: etudiantsData },
      { data: formationsData },
      { data: feuillesData },
      { data: matieresData },
      { data: formationMatieresData },
      { data: profilFormateur },
      { data: entreesData },
    ] = await Promise.all([
      requeteEtudiants,
      supabase.from("formations").select("id, nom"),
      supabase
        .from("road_maps")
        .select("id, student_id, matiere_id, formation_id, instructor_id, updated_at")
        .eq("instructor_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase.from("matieres").select("id, nom").order("nom", { ascending: true }),
      supabase.from("formation_matieres").select("formation_id, matiere_id"),
      supabase.from("profiles").select("matieres, role").eq("id", user.id).single(),
      supabase.from("road_map_entries").select("road_map_id"),
    ]);

    setEtudiants((etudiantsData as Etudiant[]) ?? []);
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));

    const comptes = new Map<number, number>();
    (entreesData ?? []).forEach((e) => {
      comptes.set(e.road_map_id, (comptes.get(e.road_map_id) ?? 0) + 1);
    });
    const feuillesAvecComptes = ((feuillesData as FeuilleRoute[]) ?? []).map((f) => ({
      ...f,
      nb_seances: comptes.get(f.id) ?? 0,
    }));
    setFeuilles(feuillesAvecComptes);

    const toutesMatieres = (matieresData as Matiere[]) ?? [];
    setMatieres(toutesMatieres);

    const parFormation = new Map<number, number[]>();
    (formationMatieresData ?? []).forEach((fm) => {
      const liste = parFormation.get(fm.formation_id) ?? [];
      liste.push(fm.matiere_id);
      parFormation.set(fm.formation_id, liste);
    });
    setMatieresParFormation(parFormation);

    // Un admin voit toutes les matières d'une formation ; un formateur ne
    // voit que celles qu'il enseigne réellement (profiles.matieres, la même
    // source que le portail formateur utilise déjà pour "Mes matières").
    if (profilFormateur?.role === "admin") {
      setMatieresDuFormateur(new Set(toutesMatieres.map((m) => m.id)));
    } else {
      const nomsFormateur = new Set<string>(profilFormateur?.matieres ?? []);
      setMatieresDuFormateur(
        new Set(toutesMatieres.filter((m) => nomsFormateur.has(m.nom)).map((m) => m.id))
      );
    }

    setChargement(false);
  }

  const etudiantChoisi = useMemo(
    () => etudiants.find((e) => e.id === etudiantId) ?? null,
    [etudiants, etudiantId]
  );

  const matieresDisponibles = useMemo(() => {
    if (!etudiantChoisi?.formation_id) return [];
    const idsFormation = matieresParFormation.get(etudiantChoisi.formation_id) ?? [];
    return matieres.filter(
      (m) => idsFormation.includes(m.id) && matieresDuFormateur.has(m.id)
    );
  }, [etudiantChoisi, matieresParFormation, matieres, matieresDuFormateur]);

  async function ouvrirOuCreer() {
    setMessage(null);

    if (!etudiantId) {
      setMessage({ type: "erreur", texte: "Sélectionne un étudiant." });
      return;
    }
    if (!matiereId) {
      setMessage({ type: "erreur", texte: "Sélectionne un cours / matière." });
      return;
    }

    // Si la feuille existe déjà pour cet étudiant + cette matière, on l'ouvre directement.
    const existante = feuilles.find(
      (f) => f.student_id === etudiantId && f.matiere_id === Number(matiereId)
    );
    if (existante) {
      router.push(`/instructor/feuilles-route/${existante.id}`);
      return;
    }

    setCreation(true);

    const { data, error } = await supabase
      .from("road_maps")
      .insert({
        instructor_id: instructorId,
        student_id: etudiantId,
        matiere_id: Number(matiereId),
        formation_id: etudiantChoisi?.formation_id ?? null,
      })
      .select("id")
      .single();

    setCreation(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    router.push(`/instructor/feuilles-route/${data.id}`);
  }

  const feuillesFiltrees = feuilles.filter((f) =>
    filtreEtudiant ? f.student_id === filtreEtudiant : true
  );

  function nomEtudiant(id: string) {
    return etudiants.find((e) => e.id === id)?.nom_complet ?? "Étudiant";
  }

  function nomMatiere(id: number) {
    return matieres.find((m) => m.id === id)?.nom ?? "Matière";
  }

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Feuilles de route"
          subtitle="Feuilles de route, page de note, relevé de notes et compte rendu, par étudiant."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <Card className="mb-6 border-2 border-red-200 bg-red-50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-red-700">
                Formulaire d&apos;évaluation hebdomadaire de l&apos;étudiant
              </h3>
              <p className="text-xs text-red-600 mt-0.5">
                À compléter tous les vendredis, un formulaire distinct par étudiant.
              </p>
            </div>
            <Link
              href="/instructor/weekly-evaluation"
              className="shrink-0 inline-block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Ouvrir le formulaire →
            </Link>
          </div>
        </Card>

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-1">
            Ouvrir ou créer une feuille de route
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Une feuille de route par étudiant et par matière. Une fois ouverte,
            tu pourras y ajouter une entrée par séance complétée. Ces feuilles
            ne sont jamais visibles par l&apos;étudiant — seulement par vous et
            par l&apos;administration (en lecture seule).
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Étudiant(e) <span className="text-red-600">*</span>
              </label>
              <select
                value={etudiantId}
                onChange={(e) => {
                  setEtudiantId(e.target.value);
                  setMatiereId("");
                }}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 bg-white"
              >
                <option value="">Sélectionnez un étudiant</option>
                {etudiants.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom_complet ?? e.email}
                    {e.formation_id ? ` — ${formations.get(e.formation_id) ?? ""}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Cours / matière <span className="text-red-600">*</span>
              </label>
              <select
                value={matiereId}
                onChange={(e) => setMatiereId(e.target.value)}
                disabled={!etudiantChoisi}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 bg-white disabled:bg-gray-100"
              >
                <option value="">Sélectionnez un cours</option>
                {matieresDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {message && (
            <div
              className={`mt-5 text-sm rounded-lg px-4 py-3 border-2 ${
                message.type === "erreur"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-green-50 border-green-200 text-green-800"
              }`}
            >
              {message.texte}
            </div>
          )}

          <div className="mt-6">
            <Button onClick={ouvrirOuCreer} disabled={creation}>
              {creation ? "Ouverture..." : "Ouvrir la feuille de route"}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-green-800">
              Mes feuilles de route ({feuillesFiltrees.length})
            </h2>
            <select
              value={filtreEtudiant}
              onChange={(e) => setFiltreEtudiant(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Tous les étudiants</option>
              {etudiants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom_complet ?? e.email}
                </option>
              ))}
            </select>
          </div>

          {feuillesFiltrees.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune feuille de route pour le moment.</p>
          ) : (
            <div className="divide-y">
              {feuillesFiltrees.map((f) => (
                <Link
                  key={f.id}
                  href={`/instructor/feuilles-route/${f.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {nomEtudiant(f.student_id)} — {nomMatiere(f.matiere_id)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {f.nb_seances ?? 0} séance{(f.nb_seances ?? 0) > 1 ? "s" : ""} enregistrée
                      {(f.nb_seances ?? 0) > 1 ? "s" : ""}
                      {f.formation_id ? ` — ${formations.get(f.formation_id) ?? ""}` : ""}
                    </p>
                  </div>
                  <span className="text-green-700 text-sm font-medium">Voir / modifier →</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
