"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type Seance = {
  id: number;
  numero: number;
  titre: string;
  formation_id: number;
  matiere_id: number | null;
};

type Matiere = { id: number; nom: string };

type FeuilleRoute = {
  id: number;
  student_id: string;
  session_id: number | null;
  formation_id: number | null;
  matiere_id: number | null;
  date_seance: string;
  heure_debut: string | null;
  heure_fin: string | null;
  theorie_donnee: string | null;
  pratiques_exercices: string | null;
  evaluations_notees: string | null;
  notes: string | null;
  created_at: string;
};

export default function FeuillesDeRoutePage() {
  const [chargement, setChargement] = useState(true);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [seances, setSeances] = useState<Seance[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matieresParFormation, setMatieresParFormation] = useState<Map<number, number[]>>(new Map());
  const [matieresDuFormateur, setMatieresDuFormateur] = useState<Set<number>>(new Set());
  const [feuilles, setFeuilles] = useState<FeuilleRoute[]>([]);
  const [instructorId, setInstructorId] = useState<string | null>(null);

  // Formulaire de création
  const [etudiantId, setEtudiantId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [seanceId, setSeanceId] = useState("");
  const [dateSeance, setDateSeance] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [theorieDonnee, setTheorieDonnee] = useState("");
  const [pratiques, setPratiques] = useState("");
  const [evaluations, setEvaluations] = useState("");
  const [notes, setNotes] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
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

    let requeteSeances = supabase
      .from("sessions")
      .select("id, numero, titre, formation_id, matiere_id")
      .order("numero", { ascending: true });
    if (formationIds !== null) {
      requeteSeances = requeteSeances.in("formation_id", formationIds);
    }

    const [
      { data: etudiantsData },
      { data: formationsData },
      { data: seancesData },
      { data: feuillesData },
      { data: matieresData },
      { data: formationMatieresData },
      { data: profilFormateur },
    ] = await Promise.all([
      requeteEtudiants,
      supabase.from("formations").select("id, nom"),
      requeteSeances,
      supabase
        .from("road_maps")
        .select(
          "id, student_id, session_id, formation_id, matiere_id, date_seance, heure_debut, heure_fin, theorie_donnee, pratiques_exercices, evaluations_notees, notes, created_at"
        )
        .eq("instructor_id", user.id)
        .is("supprime_le", null)
        .order("date_seance", { ascending: false }),
      supabase.from("matieres").select("id, nom").order("nom", { ascending: true }),
      supabase.from("formation_matieres").select("formation_id, matiere_id"),
      supabase.from("profiles").select("matieres, role").eq("id", user.id).single(),
    ]);

    setEtudiants((etudiantsData as Etudiant[]) ?? []);
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setSeances((seancesData as Seance[]) ?? []);
    setFeuilles((feuillesData as FeuilleRoute[]) ?? []);

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

  const seancesDeLaMatiere = useMemo(() => {
    if (!etudiantChoisi?.formation_id || !matiereId) return [];
    return seances.filter(
      (s) =>
        s.formation_id === etudiantChoisi.formation_id &&
        s.matiere_id === Number(matiereId)
    );
  }, [seances, etudiantChoisi, matiereId]);

  async function enregistrer() {
    setMessage(null);

    if (!etudiantId) {
      setMessage({ type: "erreur", texte: "Sélectionne un étudiant." });
      return;
    }
    if (!dateSeance) {
      setMessage({ type: "erreur", texte: "La date de la séance est obligatoire." });
      return;
    }
    if (!theorieDonnee.trim()) {
      setMessage({
        type: "erreur",
        texte: "Précise la théorie donnée durant cette séance.",
      });
      return;
    }

    setEnregistrement(true);

    const seanceChoisie = seances.find((s) => s.id === Number(seanceId));

    const { error } = await supabase.from("road_maps").insert({
      instructor_id: instructorId,
      student_id: etudiantId,
      session_id: seanceChoisie?.id ?? null,
      formation_id: etudiantChoisi?.formation_id ?? seanceChoisie?.formation_id ?? null,
      matiere_id: matiereId ? Number(matiereId) : seanceChoisie?.matiere_id ?? null,
      date_seance: dateSeance,
      heure_debut: heureDebut || null,
      heure_fin: heureFin || null,
      theorie_donnee: theorieDonnee,
      pratiques_exercices: pratiques || null,
      evaluations_notees: evaluations || null,
      notes: notes || null,
    });

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({ type: "succes", texte: "Feuille de route enregistrée." });
    setMatiereId("");
    setSeanceId("");
    setDateSeance("");
    setHeureDebut("");
    setHeureFin("");
    setTheorieDonnee("");
    setPratiques("");
    setEvaluations("");
    setNotes("");
    charger();
  }

  const feuillesFiltrees = feuilles.filter((f) =>
    filtreEtudiant ? f.student_id === filtreEtudiant : true
  );

  function nomEtudiant(id: string) {
    return etudiants.find((e) => e.id === id)?.nom_complet ?? "Étudiant";
  }

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Dossier de formation"
          subtitle="Feuilles de route, page de note, relevé de notes et compte rendu, par étudiant."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-1">
            Nouvelle feuille de route
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            À remplir pour chaque séance, avec l&apos;étudiant. Ces feuilles ne
            sont jamais visibles par l&apos;étudiant — seulement par vous et
            par l&apos;administration (en lecture seule).
          </p>

          <div className="space-y-5">
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
                    setSeanceId("");
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
                  Cours / matière
                </label>
                <select
                  value={matiereId}
                  onChange={(e) => {
                    setMatiereId(e.target.value);
                    setSeanceId("");
                  }}
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

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Séance (facultatif)
                </label>
                <select
                  value={seanceId}
                  onChange={(e) => setSeanceId(e.target.value)}
                  disabled={!matiereId}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 bg-white disabled:bg-gray-100"
                >
                  <option value="">— aucune séance liée —</option>
                  {seancesDeLaMatiere.map((s) => (
                    <option key={s.id} value={s.id}>
                      Séance {s.numero} — {s.titre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={dateSeance}
                  onChange={(e) => setDateSeance(e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Heure de début
                </label>
                <input
                  type="time"
                  value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Heure de fin
                </label>
                <input
                  type="time"
                  value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Théorie donnée <span className="text-red-600">*</span>
              </label>
              <textarea
                value={theorieDonnee}
                onChange={(e) => setTheorieDonnee(e.target.value)}
                rows={3}
                placeholder="Ex. : Chapitre 2 — création de dossier, enregistrement, notions de base"
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Pratiques / exercices (non notés)
              </label>
              <textarea
                value={pratiques}
                onChange={(e) => setPratiques(e.target.value)}
                rows={2}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Évaluations notées
              </label>
              <textarea
                value={evaluations}
                onChange={(e) => setEvaluations(e.target.value)}
                rows={2}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Remarques (facultatif)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
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
            <Button onClick={enregistrer} disabled={enregistrement}>
              {enregistrement ? "Enregistrement..." : "Enregistrer la feuille de route"}
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
                    <p className="font-medium text-gray-900">{nomEtudiant(f.student_id)}</p>
                    <p className="text-sm text-gray-500">
                      {f.date_seance}
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
