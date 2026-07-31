"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";
import {
  chargerResultatsEtudiant,
  ResultatQuiz,
  ResultatTp,
  ResultatExamen,
} from "@/lib/resultatsEtudiant";

type Profil = {
  id: string;
  email: string;
  nom_complet: string | null;
  formation_id: number | null;
};

export default function InstructorStudentDetail() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const [profil, setProfil] = useState<Profil | null>(null);
  const [nomFormation, setNomFormation] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<ResultatQuiz[]>([]);
  const [tps, setTps] = useState<ResultatTp[]>([]);
  const [examens, setExamens] = useState<ResultatExamen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function charger() {
    setLoading(true);

    const { data: profilData } = await supabase
      .from("profiles")
      .select("id, email, nom_complet, formation_id")
      .eq("id", studentId)
      .single();

    setProfil((profilData as Profil) ?? null);

    if (profilData?.formation_id) {
      const { data: formation } = await supabase
        .from("formations")
        .select("nom")
        .eq("id", profilData.formation_id)
        .single();
      setNomFormation(formation?.nom ?? null);
    }

    const { quiz: quizData, tps: tpsData, examens: examensData } =
      await chargerResultatsEtudiant(studentId);

    // Le plus récent en premier sur la vue détail (l'ordre chronologique
    // croissant, lui, sert au rapport imprimable).
    setQuiz([...quizData].reverse());
    setTps([...tpsData].reverse());
    setExamens([...examensData].reverse());

    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!profil) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Étudiant introuvable.</p>
        <Link href="/instructor/students" className="text-green-700 hover:underline text-sm">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={profil.nom_complet || profil.email}
          subtitle={
            nomFormation ? `${nomFormation} — ${profil.email}` : profil.email
          }
          backHref="/instructor/students"
          backLabel="← Mes étudiants"
          action={
            <LinkButton
              href={`/instructor/students/${studentId}/rapport`}
              variant="primary"
            >
              Générer un rapport
            </LinkButton>
          }
        />

        <div className="grid gap-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz</h2>
            {quiz.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun quiz passé pour l&apos;instant.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="p-2 font-medium">Séance</th>
                    <th className="p-2 font-medium">Score</th>
                    <th className="p-2 font-medium">Pourcentage</th>
                    <th className="p-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {quiz.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="p-2">
                        {q.numeroSeance ? `Séance ${q.numeroSeance}` : "—"}
                      </td>
                      <td className="p-2">{q.score}</td>
                      <td className="p-2">{Number(q.pourcentage).toFixed(0)} %</td>
                      <td className="p-2 text-gray-500">
                        {new Date(q.date).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">TP / Test</h2>
            {tps.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun TP remis pour l&apos;instant.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="p-2 font-medium">Séance</th>
                    <th className="p-2 font-medium">TP</th>
                    <th className="p-2 font-medium">Note</th>
                    <th className="p-2 font-medium">Remis le</th>
                  </tr>
                </thead>
                <tbody>
                  {tps.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="p-2">
                        {t.numeroSeance ? `Séance ${t.numeroSeance}` : "—"}
                      </td>
                      <td className="p-2">{t.titre}</td>
                      <td className="p-2">
                        {t.note !== null ? t.note : (
                          <span className="text-orange-600">À corriger</span>
                        )}
                      </td>
                      <td className="p-2 text-gray-500">
                        {t.date
                          ? new Date(t.date).toLocaleDateString("fr-CA")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Examens</h2>
            {examens.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun examen passé pour l&apos;instant.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="p-2 font-medium">Séance</th>
                    <th className="p-2 font-medium">Score</th>
                    <th className="p-2 font-medium">Pourcentage</th>
                    <th className="p-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {examens.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="p-2">
                        {e.numeroSeance ? `Séance ${e.numeroSeance}` : "—"}
                      </td>
                      <td className="p-2">{e.score}</td>
                      <td className="p-2">{Number(e.pourcentage).toFixed(0)} %</td>
                      <td className="p-2 text-gray-500">
                        {new Date(e.date).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
