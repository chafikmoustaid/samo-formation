"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  const profilsParId = new Map(profils.map((p) => [p.id, p]));
  const formationsParId = new Map(formations.map((f) => [f.id, f.nom]));

  // Regroupe les fiches validées par étudiant, en gardant le détail de
  // chaque semaine (fiche) pour permettre un relevé d'heures exploitable
  // (l'admin doit pouvoir voir QUAND ces heures ont été faites, pas juste
  // un total brut sans période).
  const fichesParEtudiant = new Map<
    string,
    { nom: string; nbSemaines: number; totalHeures: number; formation: string }
  >();

  for (const fiche of fiches) {
    if (fiche.statut !== "validee") continue;

    const nomEtudiant = fiche.nom_etudiant || "Étudiant inconnu";
    const heures = Number(fiche.total_heures || 0);
    const profil = profilsParId.get(fiche.user_id);
    const nomFormation = profil?.formation_id
      ? formationsParId.get(profil.formation_id) ?? "Formation inconnue"
      : "Formation non assignée";

    const existant = fichesParEtudiant.get(nomEtudiant);
    if (existant) {
      existant.nbSemaines += 1;
      existant.totalHeures += heures;
    } else {
      fichesParEtudiant.set(nomEtudiant, {
        nom: nomEtudiant,
        nbSemaines: 1,
        totalHeures: heures,
        formation: nomFormation,
      });
    }
  }

  const releveEtudiants = [...fichesParEtudiant.values()].sort((a, b) =>
    a.nom.localeCompare(b.nom)
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
              <LinkButton href="/dashboard/comptes" variant="primary">
                Gestion des comptes
              </LinkButton>
              <LinkButton href="/dashboard/securite" variant="outline">
                Sécurité
              </LinkButton>
            </div>
          }
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total fiches" value={totalFiches} href="/attendance/history" />
          <StatCard
            label="En attente"
            value={enAttente}
            accent="orange"
            href="/attendance/history?statut=en_attente"
          />
          <StatCard
            label="Validées"
            value={validees}
            accent="green"
            href="/attendance/history?statut=validee"
          />
          <StatCard
            label="Refusées"
            value={refusees}
            accent="red"
            href="/attendance/history?statut=refusee"
          />
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

        <Card className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Relevé d&apos;heures par étudiant
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Clique sur un étudiant pour voir le détail de ses fiches validées, semaine par
              semaine (nécessaire pour justifier les heures auprès d&apos;un organisme
              subventionnaire).
            </p>
          </div>

          {releveEtudiants.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune heure validée pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {releveEtudiants.map((etu) => (
                <li key={etu.nom}>
                  <Link
                    href={`/attendance/history?statut=validee&etudiant=${encodeURIComponent(
                      etu.nom
                    )}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <div>
                      <span className="text-gray-900 font-medium">{etu.nom}</span>
                      <span className="text-gray-400 ml-2">{etu.formation}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {etu.totalHeures} h
                      </span>
                      <span className="text-gray-400 ml-2">
                        sur {etu.nbSemaines} semaine{etu.nbSemaines > 1 ? "s" : ""}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
