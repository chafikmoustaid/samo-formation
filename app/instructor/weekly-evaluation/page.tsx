"use client";

import { useEffect, useMemo, useState } from "react";
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

type Bareme = "moins_75" | "entre_75_80" | "entre_80_85" | "plus_85" | "";

type Evaluation = {
  id: number;
  student_id: string;
  matiere_id: number | null;
  formation_id: number | null;
  date_evaluation: string;
  seance: string | null;
  absences: string | null;
  retards: string | null;
  bonne_attitude: string | null;
  situation_difficile: string | null;
  remarques_materiel: string | null;
  difficultes_academiques: string | null;
  bareme_performance: string | null;
  rythme_echeancier: string | null;
  discuter_direction: boolean | null;
  statut: "brouillon" | "soumise";
};

const OPTIONS_BAREME: { value: Bareme; label: string }[] = [
  { value: "moins_75", label: "Moins de 75 %" },
  { value: "entre_75_80", label: "Entre 75 % et 80 %" },
  { value: "entre_80_85", label: "Entre 80 % et 85 %" },
  { value: "plus_85", label: "Plus de 85 %" },
];

export default function EvaluationHebdomadairePage() {
  const [chargement, setChargement] = useState(true);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matieresParFormation, setMatieresParFormation] = useState<Map<number, number[]>>(new Map());
  const [matieresDuFormateur, setMatieresDuFormateur] = useState<Set<number>>(new Set());
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  const [idEnEdition, setIdEnEdition] = useState<number | null>(null);
  const [etudiantId, setEtudiantId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [seance, setSeance] = useState("");
  const [dateEvaluation, setDateEvaluation] = useState("");
  const [absences, setAbsences] = useState("");
  const [retards, setRetards] = useState("");
  const [bonneAttitude, setBonneAttitude] = useState("");
  const [situationDifficile, setSituationDifficile] = useState("");
  const [remarquesMateriel, setRemarquesMateriel] = useState("");
  const [difficultesAcademiques, setDifficultesAcademiques] = useState("");
  const [baremePerformance, setBaremePerformance] = useState<Bareme>("");
  const [rythmeEcheancier, setRythmeEcheancier] = useState("");
  const [discuterDirection, setDiscuterDirection] = useState<"" | "oui" | "non">("");

  const [enregistrement, setEnregistrement] = useState<"brouillon" | "envoi" | null>(null);
  const [message, setMessage] = useState<{ texte: string; type: "succes" | "erreur" } | null>(null);

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
      .select("role, matieres")
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
    if (formationIds !== null) requeteEtudiants = requeteEtudiants.in("formation_id", formationIds);

    const [
      { data: etudiantsData },
      { data: formationsData },
      { data: evaluationsData },
      { data: matieresData },
      { data: formationMatieresData },
    ] = await Promise.all([
      requeteEtudiants,
      supabase.from("formations").select("id, nom"),
      supabase
        .from("weekly_evaluations")
        .select(
          "id, student_id, matiere_id, formation_id, date_evaluation, seance, absences, retards, bonne_attitude, situation_difficile, remarques_materiel, difficultes_academiques, bareme_performance, rythme_echeancier, discuter_direction, statut"
        )
        .eq("instructor_id", user.id)
        .order("date_evaluation", { ascending: false }),
      supabase.from("matieres").select("id, nom").order("nom", { ascending: true }),
      supabase.from("formation_matieres").select("formation_id, matiere_id"),
    ]);

    setEtudiants((etudiantsData as Etudiant[]) ?? []);
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setEvaluations((evaluationsData as Evaluation[]) ?? []);

    const toutesMatieres = (matieresData as Matiere[]) ?? [];
    setMatieres(toutesMatieres);

    const parFormation = new Map<number, number[]>();
    (formationMatieresData ?? []).forEach((fm) => {
      const liste = parFormation.get(fm.formation_id) ?? [];
      liste.push(fm.matiere_id);
      parFormation.set(fm.formation_id, liste);
    });
    setMatieresParFormation(parFormation);

    if (profil?.role === "admin") {
      setMatieresDuFormateur(new Set(toutesMatieres.map((m) => m.id)));
    } else {
      const nomsFormateur = new Set<string>(profil?.matieres ?? []);
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

  function reinitialiser() {
    setIdEnEdition(null);
    setEtudiantId("");
    setMatiereId("");
    setSeance("");
    setDateEvaluation("");
    setAbsences("");
    setRetards("");
    setBonneAttitude("");
    setSituationDifficile("");
    setRemarquesMateriel("");
    setDifficultesAcademiques("");
    setBaremePerformance("");
    setRythmeEcheancier("");
    setDiscuterDirection("");
  }

  function chargerPourEdition(e: Evaluation) {
    setIdEnEdition(e.id);
    setEtudiantId(e.student_id);
    setMatiereId(e.matiere_id ? String(e.matiere_id) : "");
    setSeance(e.seance ?? "");
    setDateEvaluation(e.date_evaluation ?? "");
    setAbsences(e.absences ?? "");
    setRetards(e.retards ?? "");
    setBonneAttitude(e.bonne_attitude ?? "");
    setSituationDifficile(e.situation_difficile ?? "");
    setRemarquesMateriel(e.remarques_materiel ?? "");
    setDifficultesAcademiques(e.difficultes_academiques ?? "");
    setBaremePerformance((e.bareme_performance as Bareme) ?? "");
    setRythmeEcheancier(e.rythme_echeancier ?? "");
    setDiscuterDirection(e.discuter_direction == null ? "" : e.discuter_direction ? "oui" : "non");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function payloadCommun() {
    return {
      instructor_id: instructorId,
      student_id: etudiantId,
      formation_id: etudiantChoisi?.formation_id ?? null,
      matiere_id: matiereId ? Number(matiereId) : null,
      date_evaluation: dateEvaluation || null,
      seance: seance || null,
      absences: absences || null,
      retards: retards || null,
      bonne_attitude: bonneAttitude || null,
      situation_difficile: situationDifficile || null,
      remarques_materiel: remarquesMateriel || null,
      difficultes_academiques: difficultesAcademiques || null,
      bareme_performance: baremePerformance || null,
      rythme_echeancier: rythmeEcheancier || null,
      discuter_direction: discuterDirection === "" ? null : discuterDirection === "oui",
    };
  }

  async function enregistrerBrouillon() {
    setMessage(null);
    if (!etudiantId) {
      setMessage({ type: "erreur", texte: "Sélectionne un étudiant." });
      return;
    }
    if (!matiereId) {
      setMessage({ type: "erreur", texte: "Sélectionne le cours." });
      return;
    }
    if (!dateEvaluation) {
      setMessage({ type: "erreur", texte: "Indique la date." });
      return;
    }

    setEnregistrement("brouillon");

    const payload = { ...payloadCommun(), statut: "brouillon" as const };

    const { error } = idEnEdition
      ? await supabase.from("weekly_evaluations").update(payload).eq("id", idEnEdition)
      : await supabase.from("weekly_evaluations").insert(payload);

    setEnregistrement(null);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({ type: "succes", texte: "Brouillon enregistré." });
    reinitialiser();
    charger();
  }

  async function envoyerADirection() {
    setMessage(null);
    if (!etudiantId) {
      setMessage({ type: "erreur", texte: "Sélectionne un étudiant." });
      return;
    }
    if (!matiereId) {
      setMessage({ type: "erreur", texte: "Sélectionne le cours." });
      return;
    }
    if (!dateEvaluation) {
      setMessage({ type: "erreur", texte: "Indique la date." });
      return;
    }
    if (!baremePerformance) {
      setMessage({ type: "erreur", texte: "Le barème de performance est obligatoire." });
      return;
    }
    if (!discuterDirection) {
      setMessage({
        type: "erreur",
        texte: "Précise si tu aimerais discuter d'une situation particulière avec la direction.",
      });
      return;
    }

    setEnregistrement("envoi");

    const payload = {
      ...payloadCommun(),
      statut: "soumise" as const,
      date_soumission: new Date().toISOString(),
    };

    const { data, error } = idEnEdition
      ? await supabase.from("weekly_evaluations").update(payload).eq("id", idEnEdition).select("id").single()
      : await supabase.from("weekly_evaluations").insert(payload).select("id").single();

    if (error) {
      setEnregistrement(null);
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    // L'envoi du courriel ne doit jamais bloquer la soumission elle-même :
    // l'évaluation est déjà enregistrée à ce stade, quoi qu'il arrive au mail.
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch("/api/notify/weekly-evaluation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ evaluationId: data.id }),
      });
    } catch {
      // silencieux : la direction pourra toujours consulter l'évaluation dans l'app
    }

    setEnregistrement(null);
    setMessage({ type: "succes", texte: "Évaluation envoyée à la direction." });
    reinitialiser();
    charger();
  }

  async function supprimer(id: number) {
    if (!confirm("Supprimer définitivement cette évaluation ?")) return;
    const { error } = await supabase.from("weekly_evaluations").delete().eq("id", id);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    if (idEnEdition === id) reinitialiser();
    charger();
  }

  function nomEtudiant(id: string) {
    return etudiants.find((e) => e.id === id)?.nom_complet ?? "Étudiant";
  }
  function nomMatiere(id: number | null) {
    return id ? matieres.find((m) => m.id === id)?.nom ?? "Matière" : "—";
  }

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Évaluation hebdomadaire"
          subtitle="À compléter chaque vendredi pour assurer à la direction un suivi permanent."
          backHref="/instructor/feuilles-route"
          backLabel="← Retour aux feuilles de route"
        />

        <DossierTabs />

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {idEnEdition ? "Modifier l'évaluation" : "Nouvelle évaluation"}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Les informations étudiant/matière sont reprises automatiquement. Tu peux enregistrer
            un brouillon et le compléter plus tard, ou l&apos;envoyer directement à la direction.
          </p>

          <div className="space-y-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Identification
            </h3>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Étudiant(e) <span className="text-red-600">*</span>
                </label>
                <select
                  value={etudiantId}
                  onChange={(e) => {
                    setEtudiantId(e.target.value);
                    setMatiereId("");
                  }}
                  className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5 bg-white"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Cours / matière <span className="text-red-600">*</span>
                </label>
                <select
                  value={matiereId}
                  onChange={(e) => setMatiereId(e.target.value)}
                  disabled={!etudiantChoisi}
                  className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5 bg-white disabled:bg-gray-100"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={dateEvaluation}
                  onChange={(e) => setDateEvaluation(e.target.value)}
                  className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Séance</label>
                <input
                  type="text"
                  value={seance}
                  onChange={(e) => setSeance(e.target.value)}
                  placeholder="Exemple : 6 sur 25"
                  className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
                />
              </div>
            </div>

            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide pt-2">
              Évaluation et commentaires
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Est-ce que votre étudiant a eu des absences ? Si oui, nommez les raisons.
              </label>
              <textarea
                value={absences}
                onChange={(e) => setAbsences(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Est-ce que l&apos;étudiant a eu des retards ou a dû quitter plus tôt ? Si oui,
                nommez les raisons.
              </label>
              <textarea
                value={retards}
                onChange={(e) => setRetards(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Est-ce que votre étudiant a démontré une bonne attitude face à la formation ?
              </label>
              <textarea
                value={bonneAttitude}
                onChange={(e) => setBonneAttitude(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Est-ce que votre étudiant semble vivre une situation difficile personnelle ou
                avoir un problème de santé ?
              </label>
              <textarea
                value={situationDifficile}
                onChange={(e) => setSituationDifficile(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Votre étudiant fait-il des remarques par rapport au matériel scolaire ?
              </label>
              <textarea
                value={remarquesMateriel}
                onChange={(e) => setRemarquesMateriel(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Est-ce que votre étudiant rencontre des difficultés académiques ou
                d&apos;organisation ?
              </label>
              <textarea
                value={difficultesAcademiques}
                onChange={(e) => setDifficultesAcademiques(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Est-ce que votre étudiant est actuellement en voie de réussite ? Veuillez le
                situer dans le barème de performance suivant : <span className="text-red-600">*</span>
              </label>
              <div className="space-y-2">
                {OPTIONS_BAREME.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="bareme_performance"
                      checked={baremePerformance === o.value}
                      onChange={() => setBaremePerformance(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Est-ce que le rythme de l&apos;étudiant suit l&apos;échéancier de la formation ?
              </label>
              <textarea
                value={rythmeEcheancier}
                onChange={(e) => setRythmeEcheancier(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 focus:border-green-600 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Aimeriez-vous discuter d&apos;une situation particulière avec la direction ?{" "}
                <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="discuter_direction"
                    checked={discuterDirection === "oui"}
                    onChange={() => setDiscuterDirection("oui")}
                  />
                  Oui
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="discuter_direction"
                    checked={discuterDirection === "non"}
                    onChange={() => setDiscuterDirection("non")}
                  />
                  Non
                </label>
              </div>
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={enregistrerBrouillon}
              disabled={enregistrement !== null}
            >
              {enregistrement === "brouillon" ? "Enregistrement..." : "Enregistrer le brouillon"}
            </Button>
            <Button onClick={envoyerADirection} disabled={enregistrement !== null}>
              {enregistrement === "envoi" ? "Envoi..." : "Envoyer à la direction"}
            </Button>
            {idEnEdition && (
              <button
                onClick={reinitialiser}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Annuler la modification
              </button>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mes évaluations hebdomadaires ({evaluations.length})
          </h2>

          {evaluations.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune évaluation pour le moment.</p>
          ) : (
            <div className="divide-y">
              {evaluations.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-3 gap-3 flex-wrap"
                >
                  <button
                    onClick={() => chargerPourEdition(e)}
                    className="text-left hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors flex-1 min-w-[200px]"
                  >
                    <p className="font-medium text-gray-900">
                      {nomEtudiant(e.student_id)} — {nomMatiere(e.matiere_id)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {e.date_evaluation}
                      {e.seance ? ` — Séance ${e.seance}` : ""}
                    </p>
                  </button>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      e.statut === "soumise"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {e.statut === "soumise" ? "Envoyée" : "Brouillon"}
                  </span>
                  <button
                    onClick={() => supprimer(e.id)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
