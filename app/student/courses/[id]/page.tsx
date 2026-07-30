"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SeanceNav from "@/components/student/SeanceNav";

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [titre, setTitre] = useState("");
  const [htmlFidele, setHtmlFidele] = useState<string | null>(null);
  const [htmlPedagogique, setHtmlPedagogique] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) chargerSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function chargerSupport() {
    setLoading(true);

    // Le lien vient de /student/courses avec course.id — on résout vers
    // le numéro de séance (courses.session_id), comme pour le quiz et le TP.
    const { data: course } = await supabase
      .from("courses")
      .select("session_id, titre")
      .eq("id", Number(courseId))
      .single();

    if (!course) {
      setLoading(false);
      return;
    }

    setTitre(course.titre);

    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("html_fidele, html_pedagogique")
      .eq("session_id", course.session_id)
      .single();

    setHtmlFidele(lesson?.html_fidele ?? null);
    setHtmlPedagogique(lesson?.html_pedagogique ?? null);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  const html = htmlFidele ?? htmlPedagogique;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div
        className="no-print max-w-5xl mx-auto bg-white rounded-xl shadow p-8"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
      >
        <SeanceNav courseId={courseId} current="support" />

        <h1 className="text-3xl font-bold text-green-700 mt-4 mb-6">
          {titre || "Support de cours"}
        </h1>

        <SupportFrame
          html={html}
          empty="Aucun support publié pour cette séance."
          watermark="SAMO Formation — Usage interne, ne pas diffuser"
        />

        {html && (
          <p className="text-xs text-gray-400 mt-3">
            Vue protégée (clic droit, copie, sélection et impression
            désactivés).
          </p>
        )}
      </div>

      <div className="print-only p-12 text-center text-lg text-gray-700">
        Ce support de cours est la propriété de Formation SAMO et ne peut
        pas être imprimé ni exporté en PDF. Merci de le consulter en ligne
        sur formationsamo.ca.
      </div>
    </div>
  );
}

// Les fichiers générés par le pipeline pptx→HTML sont des documents HTML
// complets (<html><head><style>...</style></head><body>...). On ne peut
// pas les injecter tels quels via dangerouslySetInnerHTML : un <body>
// imbriqué dans une div provoque des conflits avec la vraie page. On
// extrait donc juste le <style> et le contenu du <body>.
function extractFragment(html: string): { style: string; body: string } {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  return {
    style: styleMatch ? styleMatch[1] : "",
    body: bodyMatch ? bodyMatch[1] : html,
  };
}

function SupportFrame({
  html,
  empty,
  watermark,
}: {
  html: string | null;
  empty: string;
  watermark?: string;
}) {
  if (!html) {
    return (
      <div className="border rounded-xl p-8 text-center text-gray-500 bg-gray-50">
        {empty}
      </div>
    );
  }

  const { style, body } = extractFragment(html);

  return (
    <div
      className="relative border rounded-xl overflow-hidden bg-gray-100 p-6"
      style={{ userSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {style && <style dangerouslySetInnerHTML={{ __html: style }} />}
      <div dangerouslySetInnerHTML={{ __html: body }} />

      {watermark && (
        <div
          className="absolute inset-0 flex flex-wrap content-start overflow-hidden"
          style={{
            pointerEvents: "none",
            opacity: 0.07,
            transform: "rotate(-22deg) scale(1.3)",
          }}
        >
          {Array.from({ length: 80 }).map((_, i) => (
            <span
              key={i}
              className="whitespace-nowrap font-bold text-black"
              style={{ fontSize: 18, margin: 28 }}
            >
              {watermark}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
