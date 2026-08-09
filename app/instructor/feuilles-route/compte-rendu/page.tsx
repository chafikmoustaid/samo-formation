"use client";

import { useEffect, useState } from "react";
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

type Matiere = { id: number; nom: string };

type CompteRendu = {
  id: number;
  student_id: string;
  formation_id: number | null;
  matiere_id: number | null;
  date_rapport: string | null;
  commentaires: string | null;
  signature_formateur: string | null;
};

export default function CompteRenduPage() {
  const [chargement, setChargement] = useState(true);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [nomFormateur, setNomFormateur] = useState("");
  const [signatureEnregistree, setSignatureEnregistree] = useState<string | null>(null);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [formations, setFormations] = useState<Map<number, string>>(new Map());
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [comptesRendus, setComptesRendus] = useState<CompteRendu[]>([]);

  const [idEnEdition, setIdEnEdition] = useState<number | null>(null);
  const [etudiantId, setEtudiantId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [dateRapport, setDateRapport] = useState("");
  const [commentaires, setCommentaires] = useState("");
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

    const [{ data: etudiantsData }, { data: formationsData }, { data: matieresData }, { data: comptesData }] =
      await Promise.all([
        requeteEtudiants,
        supabase.from("formations").select("id, nom"),
        supabase.from("matieres").select("id, nom").order("nom", { ascending: true }),
        supabase
          .from("course_reports")
          .select("id, student_id, formation_id, matiere_id, date_rapport, commentaires, signature_formateur")
          .eq("instructor_id", user.id)
          .is("supprime_le", null)
          .order("date_rapport", { ascending: false }),
      ]);

    setEtudiants((etudiantsData as Etudiant[]) ?? []);
    setFormations(new Map((formationsData ?? []).map((f) => [f.id, f.nom])));
    setMatieres((matieresData as Matiere[]) ?? []);
    setComptesRendus((comptesData as CompteRendu[]) ?? []);
    setChargement(false);
  }

  async function memoriserSignature(sig: string) {
    await supabase.rpc("update_own_signature", { nouvelle_signature: sig });
    setSignatureEnregistree(sig);
  }

  function reinitialiser() {
    setIdEnEdition(null);
    setEtudiantId("");
    setMatiereId("");
    setDateRapport("");
    setCommentaires("");
    setSignature("");
  }

  function chargerPourEdition(c: CompteRendu) {
    setIdEnEdition(c.id);
    setEtudiantId(c.student_id);
    setMatiereId(c.matiere_id ? String(c.matiere_id) : "");
    setDateRapport(c.date_rapport ?? "");
    setCommentaires(c.commentaires ?? "");
    setSignature(c.signature_formateur ?? "");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enregistrer() {
    setMessage(null);
    if (!etudiantId) {
      setMessage({ type: "erreur", texte: "Sélectionne un étudiant." });
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
      matiere_id: matiereId ? Number(matiereId) : null,
      date_rapport: dateRapport || new Date().toISOString().slice(0, 10),
      commentaires: commentaires || null,
      signature_formateur: signature,
    };

    const { error } = idEnEdition
      ? await supabase.from("course_reports").update(payload).eq("id", idEnEdition)
      : await supabase.from("course_reports").insert(payload);

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({ type: "succes", texte: "Compte rendu enregistré." });
    reinitialiser();
    charger();
  }

  async function supprimer(id: number) {
    if (!confirm("Supprimer définitivement ce compte rendu ?")) return;
    const { error } = await supabase.from("course_reports").delete().eq("id", id);
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
          subtitle="Compte rendu — à remettre avec le relevé de notes à la fin du cours."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-5">
            {idEnEdition ? "Modifier le compte rendu" : "Nouveau compte rendu"}
          </h2>

          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
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
                <label className="block text-sm font-semibold text-green-800 mb-1">Matière</label>
                <select
                  value={matiereId}
                  onChange={(e) => setMatiereId(e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 bg-white"
                >
                  <option value="">—</option>
                  {matieres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">Date</label>
              <input
                type="date"
                value={dateRapport}
                onChange={(e) => setDateRapport(e.target.value)}
                className="border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Commentaires
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Voir la feuille de route pour les notes spéciales séance par séance.
              </p>
              <textarea
                value={commentaires}
                onChange={(e) => setCommentaires(e.target.value)}
                rows={6}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5"
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
              {enregistrement ? "Enregistrement..." : idEnEdition ? "Enregistrer les modifications" : "Enregistrer le compte rendu"}
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
            Comptes rendus enregistrés ({comptesRendus.length})
          </h2>
          {comptesRendus.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun compte rendu pour le moment.</p>
          ) : (
            <div className="divide-y">
              {comptesRendus.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">{nomEtudiant(c.student_id)}</p>
                    <p className="text-sm text-gray-500">
                      {c.date_rapport ?? "—"}
                      {c.formation_id ? ` — ${formations.get(c.formation_id) ?? ""}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => chargerPourEdition(c)}
                      className="text-green-700 text-sm font-medium hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => supprimer(c.id)}
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
