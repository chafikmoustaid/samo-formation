"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { LigneDeveloppement, calculHeuresLigne } from "@/lib/ficheDeveloppement";
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

export default function DevelopmentDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [fiche, setFiche] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
      .from("development_sheets")
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

      setIsAdmin(profil?.role === "admin");
    }

    setLoading(false);
  }

  async function valider() {
    setEnregistrement(true);

    const { error } = await supabase
      .from("development_sheets")
      .update({
        statut: "validee",
        motif: null,
        date_validation: new Date().toISOString(),
      })
      .eq("id", id);

    setEnregistrement(false);

    if (error) {
      alert(error.message);
      return;
    }

    chargerFiche();
  }

  async function refuser() {
    if (!motif.trim()) {
      alert("Indique le motif du refus.");
      return;
    }

    setEnregistrement(true);

    const { error } = await supabase
      .from("development_sheets")
      .update({
        statut: "refusee",
        motif,
        date_validation: new Date().toISOString(),
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

    const response = await fetch(`/api/pdf-development/${id}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
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
    a.download = `fiche-developpement-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!fiche) {
    return <div className="p-8 text-gray-500">Fiche introuvable</div>;
  }

  const lignes: LigneDeveloppement[] = Array.isArray(fiche.lignes) ? fiche.lignes : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Fiche de développement"
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

          <div className="space-y-2 text-sm mb-6">
            <div className="flex items-start gap-3">
              <span className="font-semibold text-gray-900 w-56 shrink-0">
                Nom du(de la) formateur(trice) :
              </span>
              <span>{fiche.nom_formateur}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-semibold text-gray-900 w-56 shrink-0">
                Sujet du développement :
              </span>
              <span className="whitespace-pre-wrap">{fiche.sujet}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-semibold text-gray-900 w-56 shrink-0">
                Approuvé par :
              </span>
              <span>{fiche.approuve_par || "—"}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-semibold text-gray-900 w-56 shrink-0">
                Nombre d&apos;heures autorisées :
              </span>
              <span>{fiche.heures_autorisees ?? "—"}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-semibold text-gray-900 w-56 shrink-0">
                Heures réalisées à ce jour :
              </span>
              <span>{fiche.heures_realisees_texte || "—"}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-semibold text-gray-900 w-56 shrink-0">
                Date de remise des travaux :
              </span>
              <span>
                {fiche.date_remise
                  ? new Date(`${fiche.date_remise}T00:00:00`).toLocaleDateString("fr-CA")
                  : "—"}
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Heure de début</th>
                  <th className="p-3 font-medium">Heure de fin</th>
                  <th className="p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-3">
                      {l.date
                        ? new Date(`${l.date}T00:00:00`).toLocaleDateString("fr-CA")
                        : "—"}
                    </td>
                    <td className="p-3">{l.heureDebut}</td>
                    <td className="p-3">{l.heureFin}</td>
                    <td className="p-3">{calculHeuresLigne(l)} h</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <td className="p-3" colSpan={3}>
                    Nombre total des heures
                  </td>
                  <td className="p-3">{fiche.total_heures} h</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Signature
            </h2>

            {fiche.signature_formateur ? (
              <img
                src={fiche.signature_formateur}
                alt="Signature du formateur(trice)"
                className="border rounded bg-white h-24"
              />
            ) : (
              <p className="text-gray-500 text-sm">Aucune signature enregistrée.</p>
            )}

            <div className="mt-2 text-sm text-gray-600">
              <strong>Date :</strong>{" "}
              {fiche.date_signature_formateur
                ? new Date(fiche.date_signature_formateur).toLocaleString("fr-CA")
                : "-"}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Validation de l&apos;administration
            </h2>

            {fiche.statut === "validee" && (
              <p className="text-sm text-gray-600">
                Validée le{" "}
                {fiche.date_validation
                  ? new Date(fiche.date_validation).toLocaleString("fr-CA")
                  : "-"}
                .
              </p>
            )}

            {fiche.statut === "refusee" && (
              <div className="text-red-700 bg-red-50 border border-red-100 rounded-lg p-4 text-sm">
                <strong>Motif du refus :</strong> {fiche.motif || "Aucun motif renseigné."}
              </div>
            )}

            {fiche.statut === "en_attente" && !isAdmin && (
              <p className="text-gray-500 text-sm">
                Cette fiche attend la validation de l&apos;administration.
              </p>
            )}

            {fiche.statut === "en_attente" && isAdmin && !modeRefus && (
              <div className="flex gap-3">
                <Button onClick={valider} disabled={enregistrement}>
                  {enregistrement ? "Enregistrement..." : "Valider la fiche"}
                </Button>
                <Button variant="outline" onClick={() => setModeRefus(true)}>
                  Refuser
                </Button>
              </div>
            )}

            {fiche.statut === "en_attente" && isAdmin && modeRefus && (
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
                  <Button variant="danger" onClick={refuser} disabled={enregistrement}>
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
            <Button variant="ghost" onClick={telechargerPdf} disabled={telechargement}>
              {telechargement ? "Génération du PDF..." : "Télécharger le PDF"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
