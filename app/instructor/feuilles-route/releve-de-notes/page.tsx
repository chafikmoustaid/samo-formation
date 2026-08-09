"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";
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

type Releve = {
  id: number;
  student_id: string;
  formation_id: number | null;
  titre_cours: string | null;
  evaluations_notees_note: number | null;
  evaluations_notees_sur: number;
  examen_final_note: number | null;
  examen_final_sur: number;
  total: number | null;
  signature_formateur: string | null;
  date_signature: string | null;
};

export default function ReleveDeNotesPage() {
  const [chargement, setChargement] = useState(true);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [nomFormateur, setNomFormateur] = useState("");
  const [signatureEnregistree, setSignatureEnregistree] = useState<string | null>(null);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [releves, setReleves] = useState<Releve[]>([]);

  const [idEnEdition, setIdEnEdition] = useState<number | null>(null);
  const [etudiantId, setEtudiantId] = useState("");
  const [titreCours, setTitreCours] = useState("");
  const [evalNote, setEvalNote] = useState("");
  const [evalSur, setEvalSur] = useState("60");
  const [examenNote, setExamenNote] = useState("");
  const [examenSur, setExamenSur] = useState("40");
  const [dateSignature, setDateSignature] = useState("");
  const [signature, setSignature] = useState("");

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
      .select("role, nom_complet, signature_enregistree")
      .eq("id", user.id)
      .single();
    setNomFormateur(profil?.nom_complet ?? "");
    setSignatureEnregistree(profil?.signature_enregistree ?? null);

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

    const [{ data: etudiantsData }, { data: formationsData }, { data: relevesData }] = await Promise.all([
      requeteEtudiants,
      supabase.from("formations").select("id, nom"),
      supabase
        .from("grade_transcripts")
        .select(
          "id, student_id, formation_id, titre_cours, evaluations_notees_note, evaluations_notees_sur, examen_final_note, examen_final_sur, total, signature_formateur, date_signature"
        )
        .eq("instructor_id", user.id)
        .is("supprime_le", null)
        .order("date_signature", { ascending: false }),
    ]);

    setEtudiants((etudiantsData as Etudiant[]) ?? []);
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setReleves((relevesData as Releve[]) ?? []);
    setChargement(false);
  }

  async function memoriserSignature(sig: string) {
    await supabase.rpc("update_own_signature", { nouvelle_signature: sig });
    setSignatureEnregistree(sig);
  }

  const total = useMemo(() => {
    const ev = Number(evalNote) || 0;
    const ex = Number(examenNote) || 0;
    return ev + ex;
  }, [evalNote, examenNote]);

  function reinitialiser() {
    setIdEnEdition(null);
    setEtudiantId("");
    setTitreCours("");
    setEvalNote("");
    setEvalSur("60");
    setExamenNote("");
    setExamenSur("40");
    setDateSignature("");
    setSignature("");
  }

  function chargerPourEdition(r: Releve) {
    setIdEnEdition(r.id);
    setEtudiantId(r.student_id);
    setTitreCours(r.titre_cours ?? "");
    setEvalNote(r.evaluations_notees_note != null ? String(r.evaluations_notees_note) : "");
    setEvalSur(String(r.evaluations_notees_sur ?? 60));
    setExamenNote(r.examen_final_note != null ? String(r.examen_final_note) : "");
    setExamenSur(String(r.examen_final_sur ?? 40));
    setDateSignature(r.date_signature ?? "");
    setSignature(r.signature_formateur ?? "");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enregistrer() {
    setMessage(null);
    if (!etudiantId) {
      setMessage({ type: "erreur", texte: "Sélectionne un étudiant." });
      return;
    }
    if (!titreCours.trim()) {
      setMessage({ type: "erreur", texte: "Le titre du cours est obligatoire." });
      return;
    }
    if (!signature) {
      setMessage({ type: "erreur", texte: "La signature est obligatoire." });
      return;
    }

    const etudiant = etudiants.find((e) => e.id === etudiantId);
    setEnregistrement(true);

    const payload = {
      instructor_id: instructorId,
      student_id: etudiantId,
      formation_id: etudiant?.formation_id ?? null,
      titre_cours: titreCours,
      evaluations_notees_note: evalNote ? Number(evalNote) : null,
      evaluations_notees_sur: evalSur ? Number(evalSur) : 60,
      examen_final_note: examenNote ? Number(examenNote) : null,
      examen_final_sur: examenSur ? Number(examenSur) : 40,
      total,
      signature_formateur: signature,
      date_signature: dateSignature || new Date().toISOString().slice(0, 10),
    };

    const { error } = idEnEdition
      ? await supabase.from("grade_transcripts").update(payload).eq("id", idEnEdition)
      : await supabase.from("grade_transcripts").insert(payload);

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({ type: "succes", texte: "Relevé de notes enregistré." });
    reinitialiser();
    charger();
  }

  async function supprimer(id: number) {
    if (!confirm("Supprimer définitivement ce relevé de notes ?")) return;
    const { error } = await supabase.from("grade_transcripts").delete().eq("id", id);
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
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Dossier de formation"
          subtitle="Relevé de notes — à remettre à la fin du cours."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-5">
            {idEnEdition ? "Modifier le relevé de notes" : "Nouveau relevé de notes"}
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Étudiant(e) <span className="text-red-600">*</span>
              </label>
              <select
                value={etudiantId}
                onChange={(e) => setEtudiantId(e.target.value)}
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
                Titre du cours <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={titreCours}
                onChange={(e) => setTitreCours(e.target.value)}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    Évaluations notées
                  </label>
                  <input
                    type="number"
                    value={evalNote}
                    onChange={(e) => setEvalNote(e.target.value)}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">Sur</label>
                  <input
                    type="number"
                    value={evalSur}
                    onChange={(e) => setEvalSur(e.target.value)}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    Examen final
                  </label>
                  <input
                    type="number"
                    value={examenNote}
                    onChange={(e) => setExamenNote(e.target.value)}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">Sur</label>
                  <input
                    type="number"
                    value={examenSur}
                    onChange={(e) => setExamenSur(e.target.value)}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-green-800">{total} / 100</span>
              <span className="text-xs text-amber-700">
                Vérifiez que ce total concorde avec la page de note.
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">Date</label>
              <input
                type="date"
                value={dateSignature}
                onChange={(e) => setDateSignature(e.target.value)}
                className="border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Signature <span className="text-red-600">*</span>
            </h3>
            <SignaturePad
              onSave={(sig) => setSignature(sig)}
              nomParDefaut={nomFormateur}
              signatureEnregistree={signatureEnregistree}
              onEnregistrerPreference={memoriserSignature}
            />
            {signature && (
              <p className="mt-2 text-base text-green-700 font-medium">Signature enregistrée.</p>
            )}
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
            <Button onClick={enregistrer} disabled={enregistrement}>
              {enregistrement ? "Enregistrement..." : idEnEdition ? "Enregistrer les modifications" : "Enregistrer le relevé de notes"}
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
            Relevés de notes enregistrés ({releves.length})
          </h2>
          {releves.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun relevé de notes pour le moment.</p>
          ) : (
            <div className="divide-y">
              {releves.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">{nomEtudiant(r.student_id)}</p>
                    <p className="text-sm text-gray-500">
                      {r.titre_cours} — Total : {r.total ?? "—"}/100
                      {r.formation_id ? ` — ${formations.get(r.formation_id) ?? ""}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => chargerPourEdition(r)}
                      className="text-green-700 text-sm font-medium hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => supprimer(r.id)}
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
