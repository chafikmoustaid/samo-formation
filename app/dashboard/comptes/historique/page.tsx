"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type EntreeAudit = {
  id: number;
  created_at: string;
  actor_email: string | null;
  target_email: string | null;
  action: string;
  details: Record<string, any> | null;
};

const ACTION_LABELS: Record<string, string> = {
  role_change: "Changement de rôle",
  matieres_change: "Changement de matières",
  formation_change: "Changement de formation",
  formation_matieres_change: "Matières d'une formation modifiées",
  matiere_renommee: "Matière renommée",
  matiere_supprimee: "Matière supprimée",
  formation_renommee: "Formation renommée",
  formation_supprimee: "Formation supprimée",
  formation_heures_attendues_change: "Heures attendues modifiées",
};

const ACTION_TONE: Record<string, "warning" | "neutral"> = {
  role_change: "warning",
};

function decrireDetails(entree: EntreeAudit): string {
  const d = entree.details ?? {};

  switch (entree.action) {
    case "role_change":
      return `${d.ancien_role ?? "?"} → ${d.nouveau_role ?? "?"}`;
    case "matieres_change":
      return `${(d.anciennes_matieres ?? []).join(", ") || "aucune"} → ${
        (d.nouvelles_matieres ?? []).join(", ") || "aucune"
      }`;
    case "formation_change":
      return `formation #${d.ancienne_formation_id ?? "—"} → #${
        d.nouvelle_formation_id ?? "—"
      }`;
    case "formation_matieres_change":
      return `nouvelles matières : ${(d.nouvelles_matieres ?? []).join(", ") || "aucune"}`;
    case "matiere_renommee":
      return `${d.ancien_nom ?? "?"} → ${d.nouveau_nom ?? "?"}`;
    case "matiere_supprimee":
      return `${d.nom ?? "?"}`;
    case "formation_renommee":
      return `${d.ancien_nom ?? "?"} → ${d.nouveau_nom ?? "?"}`;
    case "formation_supprimee":
      return `${d.nom ?? "?"} (${d.etudiants_detaches ?? 0} étudiant(s) détaché(s))`;
    case "formation_heures_attendues_change":
      return `${d.anciennes_heures ?? "—"} → ${d.nouvelles_heures ?? "—"} h`;
    default:
      return JSON.stringify(d);
  }
}

export default function HistoriqueComptesPage() {
  const [entrees, setEntrees] = useState<EntreeAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setLoading(true);
    const { data } = await supabase.rpc("get_audit_log", { p_limit: 200 });
    setEntrees((data as EntreeAudit[]) ?? []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Historique des changements sensibles"
          subtitle="Rôles, formations et matières modifiés par l'administration."
          backHref="/dashboard/comptes"
          backLabel="← Retour à la gestion des comptes"
        />

        <Card>
          {loading ? (
            <div className="text-gray-500 text-sm">Chargement…</div>
          ) : entrees.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun changement enregistré pour l&apos;instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3 font-medium whitespace-nowrap">Date</th>
                  <th className="p-3 font-medium whitespace-nowrap">Effectué par</th>
                  <th className="p-3 font-medium whitespace-nowrap">Compte concerné</th>
                  <th className="p-3 font-medium">Changement</th>
                  <th className="p-3 font-medium">Détails</th>
                </tr>
              </thead>
              <tbody>
                {entrees.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 align-top">
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("fr-CA")}
                    </td>
                    <td className="p-3 whitespace-nowrap">{e.actor_email ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap">{e.target_email ?? "—"}</td>
                    <td className="p-3">
                      <Badge tone={ACTION_TONE[e.action] ?? "neutral"}>
                        {ACTION_LABELS[e.action] ?? e.action}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-600">{decrireDetails(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
