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

type LigneChapitre = { nom: string; note: string; sur: string };

type Matiere = { id: number; nom: string };

type PageDeNote = {
  id: number;
  student_id: string;
  formation_id: number | null;
  matiere_id: number | null;
  lieu_formation: string | null;
  nombre_heures: number | null;
  date_evaluation: string | null;
  chapitre_evaluations: LigneChapitre[];
  travaux_pratiques_total: number;
  travaux_pratiques_sur: number;
  examen_final_note: number | null;
  examen_final_sur: number;
  moyenne: number | null;
  note_finale: number | null;
};

function ligneVide(): LigneChapitre {
  return { nom: "", note: "", sur: "" };
}

export default function PageDeNotePage() {
  const [chargement, setChargement] = useState(true);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matieresParFormation, setMatieresParFormation] = useState<Map<number, number[]>>(new Map());
  const [matieresDuFormateur, setMatieresDuFormateur] = useState<Set<number>>(new Set());
  const [pages, setPages] = useState<PageDeNote[]>([]);

  const [idEnEdition, setIdEnEdition] = useState<number | null>(null);
  const [etudiantId, setEtudiantId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [lieuFormation, setLieuFormation] = useState("");
  const [nombreHeures, setNombreHeures] = useState("");
  const [dateEvaluation, setDateEvaluation] = useState("");
  const [lignes, setLignes] = useState<LigneChapitre[]>([ligneVide()]);
  const [examenFinalNote, setExamenFinalNote] = useState("");
  const [examenFinalSur, setExamenFinalSur] = useState("40");

  const [enregistrement, setEnregistrement] = useState(false);
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
      { data: pagesData },
      { data: matieresData },
      { data: formationMatieresData },
    ] = await Promise.all([
      requeteEtudiants,
      supabase.from("formations").select("id, nom"),
      supabase
        .from("grade_pages")
        .select(
          "id, student_id, formation_id, matiere_id, lieu_formation, nombre_heures, date_evaluation, chapitre_evaluations, travaux_pratiques_total, travaux_pratiques_sur, examen_final_note, examen_final_sur, moyenne, note_finale"
        )
        .eq("instructor_id", user.id)
        .is("supprime_le", null)
        .order("date_evaluation", { ascending: false }),
      supabase.from("matieres").select("id, nom").order("nom", { ascending: true }),
      supabase.from("formation_matieres").select("formation_id, matiere_id"),
    ]);

    setEtudiants((etudiantsData as Etudiant[]) ?? []);
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setPages((pagesData as PageDeNote[]) ?? []);

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

  function modifierLigne(index: number, champ: keyof LigneChapitre, valeur: string) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, ligneVide()]);
  }

  function retirerLigne(index: number) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  }

  const travauxPratiquesTotal = useMemo(
    () => lignes.reduce((s, l) => s + (Number(l.note) || 0), 0),
    [lignes]
  );
  const travauxPratiquesSur = useMemo(
    () => lignes.reduce((s, l) => s + (Number(l.sur) || 0), 0),
    [lignes]
  );
  const noteFinale = useMemo(() => {
    const efNote = Number(examenFinalNote) || 0;
    const efSur = Number(examenFinalSur) || 40;
    const tpSur = travauxPratiquesSur || 1;
    // Ramène les travaux pratiques sur 60 et l'examen final sur 40, comme
    // dans le classeur Excel d'origine (Travaux Pratiques /60 + Examen Final /40 = /100).
    const tpSur60 = (travauxPratiquesTotal / tpSur) * 60;
    const efSur40 = (efNote / (efSur || 1)) * 40;
    return Math.round((tpSur60 + efSur40) * 10) / 10;
  }, [travauxPratiquesTotal, travauxPratiquesSur, examenFinalNote, examenFinalSur]);

  const examenFinalDepasse =
    examenFinalNote !== "" && examenFinalSur !== "" && Number(examenFinalNote) > Number(examenFinalSur);
  const lignesDepassent = lignes.some(
    (l) => l.sur !== "" && l.note !== "" && Number(l.note) > Number(l.sur)
  );

  function reinitialiser() {
    setIdEnEdition(null);
    setEtudiantId("");
    setMatiereId("");
    setLieuFormation("");
    setNombreHeures("");
    setDateEvaluation("");
    setLignes([ligneVide()]);
    setExamenFinalNote("");
    setExamenFinalSur("40");
  }

  function chargerPourEdition(p: PageDeNote) {
    setIdEnEdition(p.id);
    setEtudiantId(p.student_id);
    setMatiereId(p.matiere_id ? String(p.matiere_id) : "");
    setLieuFormation(p.lieu_formation ?? "");
    setNombreHeures(p.nombre_heures != null ? String(p.nombre_heures) : "");
    setDateEvaluation(p.date_evaluation ?? "");
    setLignes(p.chapitre_evaluations?.length ? p.chapitre_evaluations : [ligneVide()]);
    setExamenFinalNote(p.examen_final_note != null ? String(p.examen_final_note) : "");
    setExamenFinalSur(p.examen_final_sur != null ? String(p.examen_final_sur) : "40");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enregistrer() {
    setMessage(null);
    if (!etudiantId) {
      setMessage({ type: "erreur", texte: "Sélectionne un étudiant." });
      return;
    }
    if (!matiereId) {
      setMessage({ type: "erreur", texte: "Sélectionne le cours." });
      return;
    }
    if (examenFinalDepasse || lignesDepassent) {
      setMessage({
        type: "erreur",
        texte: "Une note ne peut pas dépasser le barème (la valeur « Sur »).",
      });
      return;
    }

    const etudiant = etudiants.find((e) => e.id === etudiantId);
    const lignesRemplies = lignes.filter((l) => l.nom.trim());

    setEnregistrement(true);

    const payload = {
      instructor_id: instructorId,
      student_id: etudiantId,
      formation_id: etudiant?.formation_id ?? null,
      matiere_id: matiereId ? Number(matiereId) : null,
      lieu_formation: lieuFormation || null,
      nombre_heures: nombreHeures ? Number(nombreHeures) : null,
      date_evaluation: dateEvaluation || null,
      chapitre_evaluations: lignesRemplies,
      travaux_pratiques_total: travauxPratiquesTotal,
      travaux_pratiques_sur: travauxPratiquesSur || 60,
      examen_final_note: examenFinalNote ? Number(examenFinalNote) : null,
      examen_final_sur: examenFinalSur ? Number(examenFinalSur) : 40,
      moyenne: travauxPratiquesTotal,
      note_finale: noteFinale,
    };

    const { error } = idEnEdition
      ? await supabase.from("grade_pages").update(payload).eq("id", idEnEdition)
      : await supabase.from("grade_pages").insert(payload);

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({ type: "succes", texte: "Page de note enregistrée." });
    reinitialiser();
    charger();
  }

  async function supprimer(id: number) {
    if (!confirm("Supprimer définitivement cette page de note ?")) return;
    const { error } = await supabase.from("grade_pages").delete().eq("id", id);
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

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Dossier de formation"
          subtitle="Feuille de calcul des notes — travaux pratiques et examen final."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-1">
            {idEnEdition ? "Modifier la page de note" : "Nouvelle page de note"}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Une ligne par évaluation de chapitre — la note doit correspondre à celle inscrite sur le document remis à l&apos;étudiant.
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
                  }}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 bg-white"
                >
                  <option value="">Sélectionnez un étudiant</option>
                  {etudiants.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom_complet ?? e.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Cours <span className="text-red-600">*</span>
                </label>
                <select
                  value={matiereId}
                  onChange={(e) => setMatiereId(e.target.value)}
                  disabled={!etudiantChoisi}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 bg-white disabled:bg-gray-100"
                >
                  <option value="">
                    {etudiantChoisi ? "Sélectionnez le cours" : "Choisissez d'abord un étudiant"}
                  </option>
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
                  Lieu de la formation
                </label>
                <input
                  type="text"
                  value={lieuFormation}
                  onChange={(e) => setLieuFormation(e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Nombre d&apos;heures
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={nombreHeures}
                  onChange={(e) => setNombreHeures(e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">Date</label>
              <input
                type="date"
                value={dateEvaluation}
                onChange={(e) => setDateEvaluation(e.target.value)}
                className="border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
            </div>

            <div className="border-2 border-green-200 rounded-lg overflow-hidden">
              <div className="bg-green-50 px-4 py-3 flex items-center justify-between border-b-2 border-green-200">
                <h3 className="text-base font-semibold text-green-800">Évaluations de chapitre</h3>
                <p className="text-sm text-green-700">Nom de l&apos;examen/évaluation, note et total possible.</p>
              </div>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="p-3 font-medium">Évaluation de chapitre</th>
                    <th className="p-3 font-medium">Note</th>
                    <th className="p-3 font-medium">Sur</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">
                        <input
                          type="text"
                          value={l.nom}
                          onChange={(e) => modifierLigne(i, "nom", e.target.value)}
                          placeholder="Ex. : Évaluation chapitre 2"
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={l.sur || undefined}
                          value={l.note}
                          onChange={(e) => modifierLigne(i, "note", e.target.value)}
                          className={`w-24 border rounded-lg px-2 py-1.5 ${
                            l.sur !== "" && l.note !== "" && Number(l.note) > Number(l.sur)
                              ? "border-red-400"
                              : "border-gray-300"
                          }`}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={l.sur}
                          onChange={(e) => modifierLigne(i, "sur", e.target.value)}
                          className="w-24 border border-gray-300 rounded-lg px-2 py-1.5"
                        />
                      </td>
                      <td className="p-3">
                        {lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => retirerLigne(i)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t-2 border-green-200 bg-green-50 flex items-center justify-between">
                <Button variant="ghost" onClick={ajouterLigne}>
                  + Ajouter une évaluation
                </Button>
                <p className="text-base font-semibold text-green-800">
                  Travaux pratiques : {travauxPratiquesTotal} / {travauxPratiquesSur || 0}
                </p>
              </div>
            </div>

            <div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    Examen final — note
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={examenFinalSur || undefined}
                    value={examenFinalNote}
                    onChange={(e) => setExamenFinalNote(e.target.value)}
                    className={`w-full border-2 rounded-lg px-3 py-2.5 ${
                      examenFinalDepasse ? "border-red-400 focus:border-red-500" : "border-green-200 focus:border-green-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    Examen final — sur
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={examenFinalSur}
                    onChange={(e) => setExamenFinalSur(e.target.value)}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                  />
                </div>
              </div>
              {examenFinalDepasse && (
                <p className="text-xs text-red-600 mt-1">
                  La note ne peut pas dépasser le barème ({examenFinalSur}).
                </p>
              )}
              {lignesDepassent && (
                <p className="text-xs text-red-600 mt-1">
                  Au moins une évaluation de chapitre dépasse son barème — corrige-la avant d&apos;enregistrer.
                </p>
              )}
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Note finale (travaux pratiques /60 + examen final /40)</span>
              <span className="text-xl font-bold text-green-800">{noteFinale} / 100</span>
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

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={enregistrer} disabled={enregistrement || examenFinalDepasse || lignesDepassent}>
              {enregistrement ? "Enregistrement..." : idEnEdition ? "Enregistrer les modifications" : "Enregistrer la page de note"}
            </Button>
            {idEnEdition && (
              <Button variant="outline" onClick={reinitialiser}>
                Annuler la modification
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-800 mb-4">
            Pages de note enregistrées ({pages.length})
          </h2>
          {pages.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune page de note pour le moment.</p>
          ) : (
            <div className="divide-y">
              {pages.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">{nomEtudiant(p.student_id)}</p>
                    <p className="text-sm text-gray-500">
                      {p.date_evaluation ?? "—"}
                      {p.formation_id ? ` — ${formations.get(p.formation_id) ?? ""}` : ""}
                      {p.note_finale != null ? ` — Note finale : ${p.note_finale}/100` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => chargerPourEdition(p)}
                      className="text-green-700 text-sm font-medium hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => supprimer(p.id)}
                      className="text-red-500 text-sm font-medium hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
