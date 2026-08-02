"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type EtudiantConsolide = {
  nom: string;
  heuresValidees: number;
  fichesEnAttente: number;
  derniereActivite: string | null;
};

export default function InstructorProgressPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [etudiants, setEtudiants] = useState<EtudiantConsolide[]>([]);
  const totalSeances = 15;

  useEffect(() => {
    chargerDonnees();
    chargerMesEtudiants();
  }, []);

  async function chargerMesEtudiants() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: fiches } = await supabase
      .from("attendance")
      .select("nom_etudiant, total_heures, statut, created_at")
      .eq("formateur_id", user.id)
      .is("supprime_le", null);

    const parEtudiant = new Map<string, EtudiantConsolide>();

    for (const fiche of fiches ?? []) {
      const nom = fiche.nom_etudiant || "Étudiant inconnu";
      const courant = parEtudiant.get(nom) ?? {
        nom,
        heuresValidees: 0,
        fichesEnAttente: 0,
        derniereActivite: null,
      };

      if (fiche.statut === "validee") {
        courant.heuresValidees += Number(fiche.total_heures || 0);
      }
      if (fiche.statut === "en_attente") {
        courant.fichesEnAttente += 1;
      }
      if (
        fiche.created_at &&
        (!courant.derniereActivite || fiche.created_at > courant.derniereActivite)
      ) {
        courant.derniereActivite = fiche.created_at;
      }

      parEtudiant.set(nom, courant);
    }

    setEtudiants(
      Array.from(parEtudiant.values()).sort(
        (a, b) => b.heuresValidees - a.heuresValidees
      )
    );
  }

  async function chargerDonnees() {
    const { data: students } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student");

    const { data: quizs } = await supabase.from("quiz_results").select("*");

    const { data: tps } = await supabase
      .from("assignment_submissions")
      .select("*");

    const resultat =
      students?.map((student) => {
        const quizCount =
          quizs?.filter((q) => q.user_id === student.id).length ?? 0;

        const tpCount =
          tps?.filter((tp) => tp.student_id === student.id).length ?? 0;

        const progressionQuiz = (quizCount / totalSeances) * 100;
        const progressionTP = (tpCount / totalSeances) * 100;

        const progression = ((progressionQuiz + progressionTP) / 2).toFixed(0);

        return {
          email: student.email,
          quizCount,
          tpCount,
          progression,
        };
      }) ?? [];

    setRows(resultat);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Progression des étudiants"
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        <Card className="p-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Mes étudiants — fiches de présence
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Vue consolidée des étudiants dont les fiches te sont assignées.
          </p>

          {etudiants.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucune fiche ne t&apos;est encore assignée.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3 font-medium">Étudiant</th>
                  <th className="p-3 font-medium">Heures validées</th>
                  <th className="p-3 font-medium">Fiches en attente</th>
                  <th className="p-3 font-medium">Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {etudiants.map((e) => (
                  <tr key={e.nom} className="border-b last:border-0">
                    <td className="p-3">{e.nom}</td>
                    <td className="p-3">{e.heuresValidees} h</td>
                    <td className="p-3">
                      {e.fichesEnAttente > 0 ? (
                        <Badge tone="warning">{e.fichesEnAttente} en attente</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {e.derniereActivite
                        ? new Date(e.derniereActivite).toLocaleDateString("fr-CA")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-4 overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Progression cours
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3 font-medium">Étudiant</th>
                <th className="p-3 font-medium">Quiz</th>
                <th className="p-3 font-medium">TP</th>
                <th className="p-3 font-medium">Progression</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{row.quizCount}/15</td>
                  <td className="p-3">{row.tpCount}/15</td>
                  <td className="p-3">{row.progression} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
