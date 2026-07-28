"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";
import FicheTable from "@/components/FicheTable";
import { LigneFiche } from "@/lib/fichePresence";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const STATUT_TONE: Record<string, "warning" | "success" | "danger"> = {
  en_attente: "warning",
  validee: "success",
  refusee: "danger",
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente de validation",
  validee: "Validée",
  refusee: "Refusée",
};

export default function AttendanceDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [fiche, setFiche] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [signatureFormateur, setSignatureFormateur] = useState<string | null>(
    null
  );
  const [signatureEnregistree, setSignatureEnregistree] = useState<
    string | null
  >(null);
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
      setUserId(user.id);

      const { data: profil } = await supabase
        .from("profiles")
        .select("role, signature_enregistree")
        .eq("id", user.id)
        .single();

      setIsStaff(profil?.role === "instructor" || profil?.role === "admin");
      setIsAdmin(profil?.role === "admin");
      setSignatureEnregistree(profil?.signature_enregistree ?? null);
    }

    setLoading(false);
  }

  async function memoriserSignature(signature: string) {
    await supabase.rpc("update_own_signature", {
      nouvelle_signature: signature,
    });
    setSignatureEnregistree(signature);
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
        formateur_id: fiche.formateur_id ?? userId,
        statut: "validee",
        motif: null,
      })
      .eq("id", id);

    setEnregistrement(false);

    if (error) {
      alert(error.message);
      return;
    }

    notifier(id, "validee");
    chargerFiche();
  }

  async function notifier(ficheId: string, type: "creee" | "validee" | "refusee") {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ ficheId, type }),
    }).catch(() => {
      // La notification par courriel est non bloquante.
    });
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

    notifier(id, "refusee");
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
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!fiche) {
    return <div className="p-8 text-gray-500">Fiche introuvable</div>;
  }

  const lignes: LigneFiche[] = Array.isArray(fiche.lignes) ? fiche.lignes : [];

  const peutValider =
    isStaff && (isAdmin || !fiche.formateur_id || fiche.formateur_id === userId);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Fiche de présence"
          action={
            <Badge tone={STATUT_TONE[fiche.statut] ?? "neutral"}>
              {STATUT_LABELS[fiche.statut] ?? fiche.statut}
            </Badge>
          }
        />

        <Card>
          <div className="mb-6">
            <Image
              src="/logo-samo.png"
              alt="Formation SAMO"
              width={260}
              height={78}
              className="h-16 w-auto mb-3"
            />
          </div>

          <div className="max-w-md mx-auto mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-wide text-center mb-5">
              FICHE DE PRÉSENCE
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900 w-44 shrink-0 text-right">
                  Nom de l&apos;étudiant(e) :
                </span>
                <span className="flex-1 bg-gray-100 border border-black rounded-sm px-2 py-1">
                  {fiche.nom_etudiant}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900 w-44 shrink-0 text-right">
                  Nom du formateur(trice) :
                </span>
                <span className="flex-1 bg-gray-100 border border-black rounded-sm px-2 py-1">
                  {fiche.nom_formateur || "—"}
                </span>
              </div>
            </div>
          </div>

          {lignes.length > 0 ? (
            <div className="overflow-x-auto">
              <FicheTable lignes={lignes} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Total heures : {fiche.total_heures ?? 0} h
            </p>
          )}

          {fiche.motif_heures && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3 text-sm">
              <span className="font-semibold text-gray-900">
                Motif (écart d&apos;heures) :{" "}
              </span>
              {fiche.motif_heures}
            </div>
          )}

          <div className="mt-10 border border-gray-200 rounded-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Signature étudiant
            </h2>

            {fiche.signature_etudiant ? (
              <img
                src={fiche.signature_etudiant}
                alt="Signature de l'étudiant"
                className="border rounded bg-white h-24"
              />
            ) : (
              <p className="text-gray-500 text-sm">
                Aucune signature enregistrée.
              </p>
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

          <div className="mt-6 border border-gray-200 rounded-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Validation du formateur
            </h2>

            {fiche.statut === "validee" && (
              <>
                {fiche.signature_formateur ? (
                  <img
                    src={fiche.signature_formateur}
                    alt="Signature du formateur"
                    className="border rounded bg-white h-24"
                  />
                ) : (
                  <p className="text-gray-500 text-sm">
                    Aucune signature enregistrée.
                  </p>
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
              <div className="text-red-700 bg-red-50 border border-red-100 rounded-lg p-4 text-sm">
                <strong>Motif du refus :</strong>{" "}
                {fiche.motif || "Aucun motif renseigné."}
              </div>
            )}

            {fiche.statut === "en_attente" && !peutValider && (
              <p className="text-gray-500 text-sm">
                {isStaff
                  ? "Cette fiche est assignée à un autre formateur."
                  : "Cette fiche attend la validation du formateur."}
              </p>
            )}

            {fiche.statut === "en_attente" && peutValider && !modeRefus && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Vérifie les heures déclarées, puis signe pour valider cette
                  fiche.
                </p>

                <SignaturePad
                  onSave={setSignatureFormateur}
                  nomParDefaut={fiche.nom_formateur ?? ""}
                  signatureEnregistree={signatureEnregistree}
                  onEnregistrerPreference={memoriserSignature}
                />

                {signatureFormateur && (
                  <p className="text-sm text-green-700">
                    Signature enregistrée, prête à être validée.
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={validerFiche}
                    disabled={enregistrement || !signatureFormateur}
                  >
                    {enregistrement ? "Enregistrement..." : "Valider la fiche"}
                  </Button>

                  <Button variant="outline" onClick={() => setModeRefus(true)}>
                    Refuser
                  </Button>
                </div>
              </div>
            )}

            {fiche.statut === "en_attente" && peutValider && modeRefus && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Motif du refus
                </label>

                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm"
                  placeholder="Explique pourquoi cette fiche est refusée..."
                />

                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    onClick={refuserFiche}
                    disabled={enregistrement}
                  >
                    {enregistrement ? "Enregistrement..." : "Confirmer le refus"}
                  </Button>

                  <Button variant="outline" onClick={() => setModeRefus(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <Button
              variant="ghost"
              onClick={telechargerPdf}
              disabled={telechargement}
            >
              {telechargement ? "Génération du PDF..." : "Télécharger le PDF"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
