"use client";

import { useEffect, useState } from "react";
import DashboardChart from "@/components/DashboardChart";
import { supabase } from "@/lib/supabase";
import LinkButton from "@/components/ui/LinkButton";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

function exporterHeuresCsv(
  titre: string,
  fichierSuffixe: string,
  lignes: [string, number][]
) {
  const echapper = (valeur: unknown) => `"${String(valeur ?? "").replace(/"/g, '""')}"`;
  const csv =
    "﻿" +
    [
      [titre, "Heures validées"].map(echapper).join(","),
      ...lignes.map(([nom, heures]) => [nom, heures].map(echapper).join(",")),
    ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `heures-${fichierSuffixe}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUT_TONE = {
  en_attente: "warning",
  validee: "success",
  refusee: "danger",
} as const;

const SEUIL_RETARD_JOURS = 7;

export default function Dashboard() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [profils, setProfils] = useState<any[]>([]);
  const [formations, setFormations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    const [{ data: fichesData }, { data: profilsData }, { data: formationsData }] =
      await Promise.all([
        supabase.from("attendance").select("*").order("id", { ascending: false }),
        supabase.from("profiles").select("id, formation_id, nom_complet, email"),
        supabase.from("formations").select("id, nom"),
      ]);

    setFiches(fichesData ?? []);
    setProfils(profilsData ?? []);
    setFormations(formationsData ?? []);
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

  const profilsParId = new Map(profils.map((p) => [p.id, p]));
  const formationsParId = new Map(formations.map((f) => [f.id, f.nom]));

  const heuresParEtudiant = new Map<string, number>();
  const heuresParFormation = new Map<string, number>();

  for (const fiche of fiches) {
    if (fiche.statut !== "validee") continue;

    const heures = Number(fiche.total_heures || 0);
    const nomEtudiant = fiche.nom_etudiant || "Étudiant inconnu";
    heuresParEtudiant.set(
      nomEtudiant,
      (heuresParEtudiant.get(nomEtudiant) || 0) + heures
    );

    const profil = profilsParId.get(fiche.user_id);
    const nomFormation = profil?.formation_id
      ? formationsParId.get(profil.formation_id) ?? "Formation inconnue"
      : "Formation non assignée";
    heuresParFormation.set(
      nomFormation,
      (heuresParFormation.get(nomFormation) || 0) + heures
    );
  }

  const classementEtudiants = [...heuresParEtudiant.entries()].sort(
    (a, b) => b[1] - a[1]
  );
  const classementFormations = [...heuresParFormation.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  const maintenant = Date.now();
  const fichesEnRetard = fiches
    .filter((f) => f.statut === "en_attente" && f.created_at)
    .map((f) => ({
      ...f,
      joursAttente: Math.floor(
        (maintenant - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .filter((f) => f.joursAttente >= SEUIL_RETARD_JOURS)
    .sort((a, b) => b.joursAttente - a.joursAttente);

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
              <LinkButton href="/dashboard/securite" variant="outline">
                Sécurité
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

        {fichesEnRetard.length > 0 && (
          <Card className="mt-8 border-amber-200 bg-amber-50">
            <h2 className="text-lg font-semibold text-amber-900 mb-1">
              Fiches en attente depuis plus de {SEUIL_RETARD_JOURS} jours
            </h2>
            <p className="text-sm text-amber-800 mb-4">
              Ces fiches n&apos;ont pas encore été validées par leur formateur(trice).
            </p>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200 text-left text-amber-700">
                  <th className="p-3 font-medium">Étudiant</th>
                  <th className="p-3 font-medium">Formateur</th>
                  <th className="p-3 font-medium">En attente depuis</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>

              <tbody>
                {fichesEnRetard.map((fiche) => (
                  <tr key={fiche.id} className="border-b border-amber-100 last:border-0">
                    <td className="p-3">{fiche.nom_etudiant}</td>
                    <td className="p-3">{fiche.nom_formateur || "—"}</td>
                    <td className="p-3">{fiche.joursAttente} jours</td>
                    <td className="p-3">
                      <LinkButton href={`/attendance/${fiche.id}`} variant="outline">
                        Voir la fiche
                      </LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

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

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Heures cumulées par formation
              </h2>
              {classementFormations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exporterHeuresCsv("Formation", "par-formation", classementFormations)
                  }
                >
                  Exporter
                </Button>
              )}
            </div>

            {classementFormations.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune heure validée pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-3">
                {classementFormations.map(([nom, heures]) => (
                  <li key={nom} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{nom}</span>
                    <span className="font-semibold text-gray-900">{heures} h</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Heures cumulées par étudiant
              </h2>
              {classementEtudiants.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exporterHeuresCsv("Étudiant", "par-etudiant", classementEtudiants)
                  }
                >
                  Exporter
                </Button>
              )}
            </div>

            {classementEtudiants.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune heure validée pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto">
                {classementEtudiants.map(([nom, heures]) => (
                  <li key={nom} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{nom}</span>
                    <span className="font-semibold text-gray-900">{heures} h</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
