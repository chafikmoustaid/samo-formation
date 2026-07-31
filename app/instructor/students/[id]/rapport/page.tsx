"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  chargerResultatsEtudiant,
  ResultatQuiz as LigneQuiz,
  ResultatTp as LigneTp,
  ResultatExamen as LigneExamen,
} from "@/lib/resultatsEtudiant";

type Profil = {
  id: string;
  email: string;
  nom_complet: string | null;
  formation_id: number | null;
};

function moyenne(valeurs: number[]): string {
  if (valeurs.length === 0) return "—";
  return (valeurs.reduce((a, b) => a + b, 0) / valeurs.length).toFixed(0);
}

export default function RapportEtudiant() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const [profil, setProfil] = useState<Profil | null>(null);
  const [nomFormation, setNomFormation] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<LigneQuiz[]>([]);
  const [tps, setTps] = useState<LigneTp[]>([]);
  const [examens, setExamens] = useState<LigneExamen[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

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

    setQuiz(quizData);
    setTps(tpsData);
    setExamens(examensData);

    setLoading(false);
  }

  function dansLaPeriode(dateIso: string | null): boolean {
    if (!dateIso) return false;
    const t = new Date(dateIso).getTime();
    if (dateDebut && t < new Date(dateDebut).getTime()) return false;
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      if (t > fin.getTime()) return false;
    }
    return true;
  }

  const quizFiltres = useMemo(
    () => quiz.filter((q) => dansLaPeriode(q.date)),
    [quiz, dateDebut, dateFin]
  );
  const tpsFiltres = useMemo(
    () => tps.filter((t) => dansLaPeriode(t.date)),
    [tps, dateDebut, dateFin]
  );
  const examensFiltres = useMemo(
    () => examens.filter((e) => dansLaPeriode(e.date)),
    [examens, dateDebut, dateFin]
  );

  function appliquerRaccourci(raccourci: "tout" | "semaine" | "mois") {
    if (raccourci === "tout") {
      setDateDebut("");
      setDateFin("");
      return;
    }
    const aujourdHui = new Date();
    const debut = new Date(aujourdHui);
    if (raccourci === "semaine") debut.setDate(debut.getDate() - 7);
    if (raccourci === "mois") debut.setMonth(debut.getMonth() - 1);
    setDateDebut(debut.toISOString().slice(0, 10));
    setDateFin(aujourdHui.toISOString().slice(0, 10));
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!profil) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Étudiant introuvable.</p>
      </div>
    );
  }

  const periodeLabel =
    dateDebut || dateFin
      ? `Du ${dateDebut ? new Date(dateDebut).toLocaleDateString("fr-CA") : "…"} au ${
          dateFin ? new Date(dateFin).toLocaleDateString("fr-CA") : "…"
        }`
      : "Toute la période";

  return (
    <div className="min-h-screen bg-gray-50 p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        <div className="no-print mb-6 flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/instructor/students/${studentId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour à l&apos;étudiant
          </Link>
          <Button onClick={() => window.print()}>Imprimer / Enregistrer en PDF</Button>
        </div>

        <Card className="no-print mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Période du rapport</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => appliquerRaccourci("tout")}
                className="text-green-700 hover:underline"
              >
                Toute la période
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => appliquerRaccourci("semaine")}
                className="text-green-700 hover:underline"
              >
                Cette semaine
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => appliquerRaccourci("mois")}
                className="text-green-700 hover:underline"
              >
                Ce mois-ci
              </button>
            </div>
          </div>
        </Card>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 print:shadow-none print:border-0 print:p-0">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <Image
              src="/logo-samo.png"
              alt="Formation SAMO"
              width={180}
              height={54}
              className="h-12 w-auto"
            />
            <div className="text-right">
              <h1 className="text-xl font-bold text-gray-900">
                Rapport de résultats
              </h1>
              <p className="text-sm text-gray-500">{periodeLabel}</p>
            </div>
          </div>

          <div className="mb-8 text-sm">
            <p>
              <span className="font-semibold text-gray-900">Étudiant : </span>
              {profil.nom_complet || profil.email}
            </p>
            <p className="text-gray-600">{profil.email}</p>
            {nomFormation && (
              <p>
                <span className="font-semibold text-gray-900">Formation : </span>
                {nomFormation}
              </p>
            )}
            <p className="text-gray-400 text-xs mt-2">
              Généré le {new Date().toLocaleDateString("fr-CA")}
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Quiz</h2>
            <p className="text-xs text-gray-500 mb-3">
              {quizFiltres.length} quiz — moyenne{" "}
              {moyenne(quizFiltres.map((q) => Number(q.pourcentage)))} %
            </p>
            {quizFiltres.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun quiz dans cette période.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1.5 font-medium">Séance</th>
                    <th className="py-1.5 font-medium">Score</th>
                    <th className="py-1.5 font-medium">Pourcentage</th>
                    <th className="py-1.5 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {quizFiltres.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="py-1.5">
                        {q.numeroSeance ? `Séance ${q.numeroSeance}` : "—"}
                      </td>
                      <td className="py-1.5">{q.score}</td>
                      <td className="py-1.5">{Number(q.pourcentage).toFixed(0)} %</td>
                      <td className="py-1.5 text-gray-500">
                        {new Date(q.date).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-1">TP / Test</h2>
            <p className="text-xs text-gray-500 mb-3">
              {tpsFiltres.length} remise(s) — moyenne{" "}
              {moyenne(
                tpsFiltres
                  .filter((t) => t.note !== null)
                  .map((t) => Number(t.note))
              )}
            </p>
            {tpsFiltres.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune remise dans cette période.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1.5 font-medium">Séance</th>
                    <th className="py-1.5 font-medium">TP</th>
                    <th className="py-1.5 font-medium">Note</th>
                    <th className="py-1.5 font-medium">Remis le</th>
                  </tr>
                </thead>
                <tbody>
                  {tpsFiltres.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-1.5">
                        {t.numeroSeance ? `Séance ${t.numeroSeance}` : "—"}
                      </td>
                      <td className="py-1.5">{t.titre}</td>
                      <td className="py-1.5">
                        {t.note !== null ? t.note : "À corriger"}
                      </td>
                      <td className="py-1.5 text-gray-500">
                        {t.date ? new Date(t.date).toLocaleDateString("fr-CA") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Examens</h2>
            <p className="text-xs text-gray-500 mb-3">
              {examensFiltres.length} examen(s) — moyenne{" "}
              {moyenne(examensFiltres.map((e) => Number(e.pourcentage)))} %
            </p>
            {examensFiltres.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun examen dans cette période.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1.5 font-medium">Séance</th>
                    <th className="py-1.5 font-medium">Score</th>
                    <th className="py-1.5 font-medium">Pourcentage</th>
                    <th className="py-1.5 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {examensFiltres.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-1.5">
                        {e.numeroSeance ? `Séance ${e.numeroSeance}` : "—"}
                      </td>
                      <td className="py-1.5">{e.score}</td>
                      <td className="py-1.5">{Number(e.pourcentage).toFixed(0)} %</td>
                      <td className="py-1.5 text-gray-500">
                        {new Date(e.date).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
