"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";

const STATUT_LABELS: Record<string, { texte: string; classe: string }> = {
  en_attente: {
    texte: "⏳ En attente de validation",
    classe: "bg-yellow-100 text-yellow-800",
  },
  validee: {
    texte: "✅ Validée",
    classe: "bg-green-100 text-green-800",
  },
  refusee: {
    texte: "❌ Refusée",
    classe: "bg-red-100 text-red-800",
  },
};

export default function AttendanceDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [fiche, setFiche] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  const [signatureFormateur, setSignatureFormateur] = useState<string | null>(
    null
  );
  const [enregistrement, setEnregistrement] = useState(false);

  const [modeRefus, setModeRefus] = useState(false);
  const [motif, setMotif] = useState("");

  const [telechargement, setTelechargement] = useState(false);

  useEffect(() => {
    if (id) chargerFiche();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chargerFiche() {
    setLoading(true);

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single();

    setFiche(data ?? null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsStaff(
        profil?.role === "instructor" || profil?.role === "admin"
      );
    }

    setLoading(false);
  }

  async function validerFiche() {
    if (!signatureFormateur) {
      alert("Enregistre d'abord ta signature.");
      return;
    }

    setEnregistrement(true);

    const { error } = await supabase
      .from("attendance")
      .update({
        signature_formateur: signatureFormateur,
        date_signature_formateur: new Date().toISOString(),
        statut: "validee",
        motif: null,
      })
      .eq("id", id);

    setEnregistrement(false);

    if (error) {
      alert(error.message);
      return;
    }

    chargerFiche();
  }

  async function refuserFiche() {
    if (!motif.trim()) {
      alert("Indique le motif du refus.");
      return;
    }

    setEnregistrement(true);

    const { error } = await supabase
      .from("attendance")
      .update({
        statut: "refusee",
        motif,
        date_signature_formateur: new Date().toISOString(),
      })
      .eq("id", id);

    setEnregistrement(false);

    if (error) {
      alert(error.message);
      return;
    }

    chargerFiche();
  }

  async function telechargerPdf() {
    setTelechargement(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(`/api/pdf/${id}`, {
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    setTelechargement(false);

    if (!response.ok) {
      alert("Impossible de générer le PDF.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiche-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (!fiche) {
    return <div className="p-8">Fiche introuvable</div>;
  }

  const statutInfo =
    STATUT_LABELS[fiche.statut] ?? STATUT_LABELS.en_attente;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-4xl font-bold text-green-700">
            Fiche de présence
          </h1>

          <span
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${statutInfo.classe}`}
          >
            {statutInfo.texte}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <strong>Étudiant :</strong> {fiche.nom_etudiant}
          </div>

          <div>
            <strong>Formateur :</strong> {fiche.nom_formateur}
          </div>

          <div>
            <strong>Matière :</strong> {fiche.matiere}
          </div>

          <div>
            <strong>Total :</strong> {fiche.total_heures} h
          </div>

          <div>
            <strong>Semaine du :</strong> {String(fiche.semaine_debut)}
          </div>

          <div>
            <strong>Au :</strong> {String(fiche.semaine_fin)}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Heures</h2>

          <ul className="space-y-2">
            <li>Lundi : {fiche.lundi} h</li>
            <li>Mardi : {fiche.mardi} h</li>
            <li>Mercredi : {fiche.mercredi} h</li>
            <li>Jeudi : {fiche.jeudi} h</li>
            <li>Vendredi : {fiche.vendredi} h</li>
          </ul>
        </div>

        <div className="mt-10 border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Signature étudiant</h2>

          {fiche.signature_etudiant ? (
            <img
              src={fiche.signature_etudiant}
              alt="Signature de l'étudiant"
              className="border rounded bg-white h-24"
            />
          ) : (
            <p className="text-gray-500">Aucune signature enregistrée.</p>
          )}

          <div className="mt-2 text-sm text-gray-600">
            <strong>Date :</strong>{" "}
            {fiche.date_signature_etudiant
              ? new Date(fiche.date_signature_etudiant).toLocaleString(
                  "fr-CA"
                )
              : "-"}
          </div>
        </div>

        <div className="mt-10 border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Validation du formateur</h2>

          {fiche.statut === "validee" && (
            <>
              {fiche.signature_formateur ? (
                <img
                  src={fiche.signature_formateur}
                  alt="Signature du formateur"
                  className="border rounded bg-white h-24"
                />
              ) : (
                <p className="text-gray-500">Aucune signature enregistrée.</p>
              )}

              <div className="mt-2 text-sm text-gray-600">
                <strong>Validée le :</strong>{" "}
                {fiche.date_signature_formateur
                  ? new Date(fiche.date_signature_formateur).toLocaleString(
                      "fr-CA"
                    )
                  : "-"}
              </div>
            </>
          )}

          {fiche.statut === "refusee" && (
            <div className="text-red-700 bg-red-50 border border-red-100 rounded-lg p-4">
              <strong>Motif du refus :</strong>{" "}
              {fiche.motif || "Aucun motif renseigné."}
            </div>
          )}

          {fiche.statut === "en_attente" && !isStaff && (
            <p className="text-gray-500">
              Cette fiche attend la validation du formateur.
            </p>
          )}

          {fiche.statut === "en_attente" && isStaff && !modeRefus && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Vérifie les heures déclarées, puis signe pour valider cette
                fiche.
              </p>

              <SignaturePad onSave={setSignatureFormateur} />

              {signatureFormateur && (
                <p className="text-sm text-green-700">
                  ✓ Signature enregistrée, prête à être validée.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={validerFiche}
                  disabled={enregistrement || !signatureFormateur}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium"
                >
                  {enregistrement ? "Enregistrement..." : "✅ Valider la fiche"}
                </button>

                <button
                  onClick={() => setModeRefus(true)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-3 rounded-lg font-medium"
                >
                  ❌ Refuser
                </button>
              </div>
            </div>
          )}

          {fiche.statut === "en_attente" && isStaff && modeRefus && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Motif du refus
              </label>

              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={4}
                className="w-full border rounded-lg p-3"
                placeholder="Explique pourquoi cette fiche est refusée..."
              />

              <div className="flex gap-3">
                <button
                  onClick={refuserFiche}
                  disabled={enregistrement}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium"
                >
                  {enregistrement ? "Enregistrement..." : "Confirmer le refus"}
                </button>

                <button
                  onClick={() => setModeRefus(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10">
          <button
            onClick={telechargerPdf}
            disabled={telechargement}
            className="text-blue-600 hover:underline disabled:opacity-50"
          >
            {telechargement ? "Génération du PDF..." : "📄 Télécharger le PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
