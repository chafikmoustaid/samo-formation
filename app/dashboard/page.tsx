"use client";

import { useEffect, useState } from "react";
import DashboardChart from "@/components/DashboardChart";
import { supabase } from "@/lib/supabase";
import LinkButton from "@/components/ui/LinkButton";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const STATUT_TONE = {
  en_attente: "warning",
  validee: "success",
  refusee: "danger",
} as const;

export default function Dashboard() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerFiches();
  }, []);

  async function chargerFiches() {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .order("id", { ascending: false });

    setFiches(data ?? []);
    setLoading(false);
  }

  const totalFiches = fiches.length;
  const enAttente = fiches.filter((f) => f.statut === "en_attente").length;
  const validees = fiches.filter((f) => f.statut === "validee").length;
  const refusees = fiches.filter((f) => f.statut === "refusee").length;

  const totalHeures = fiches.reduce(
    (total, fiche) => total + Number(fiche.total_heures || 0),
    0
  );

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Tableau de bord SAMO"
          action={
            <div className="flex gap-3">
              <LinkButton href="/attendance" variant="primary">
                Nouvelle fiche
              </LinkButton>
              <LinkButton href="/attendance/history" variant="outline">
                Historique
              </LinkButton>
              <LinkButton href="/dashboard/comptes" variant="outline">
                Gestion des comptes
              </LinkButton>
            </div>
          }
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard label="Total fiches" value={totalFiches} />
          <StatCard label="En attente" value={enAttente} accent="orange" />
          <StatCard label="Validées" value={validees} accent="green" />
          <StatCard label="Refusées" value={refusees} accent="red" />
          <StatCard label="Total heures" value={totalHeures} />
        </div>

        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Répartition des statuts
          </h2>

          <DashboardChart
            enAttente={enAttente}
            validees={validees}
            refusees={refusees}
          />
        </Card>

        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Dernières fiches
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3 font-medium">Étudiant</th>
                <th className="p-3 font-medium">Formateur</th>
                <th className="p-3 font-medium">Total</th>
                <th className="p-3 font-medium">Statut</th>
              </tr>
            </thead>

            <tbody>
              {fiches.slice(0, 5).map((fiche) => (
                <tr key={fiche.id} className="border-b last:border-0">
                  <td className="p-3">{fiche.nom_etudiant}</td>
                  <td className="p-3">{fiche.nom_formateur}</td>
                  <td className="p-3">{fiche.total_heures} h</td>
                  <td className="p-3">
                    <Badge
                      tone={
                        STATUT_TONE[
                          fiche.statut as keyof typeof STATUT_TONE
                        ] ?? "neutral"
                      }
                    >
                      {fiche.statut}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
