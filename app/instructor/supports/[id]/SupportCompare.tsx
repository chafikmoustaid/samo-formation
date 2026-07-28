"use client";

import { useState } from "react";

type AuditIssue = {
  slide: number;
  type: string;
  title?: string | null;
};

type AuditReport = {
  file?: string;
  slides?: number;
  issues?: AuditIssue[];
  integrity_score?: number;
};

type Props = {
  titre: string;
  htmlFidele: string | null;
  htmlPedagogique: string | null;
  integrityScore: number | null;
  auditReport: AuditReport | null;
};

type Mode = "pedagogique" | "fidele" | "audit";

export default function SupportCompare({
  titre,
  htmlFidele,
  htmlPedagogique,
  integrityScore,
  auditReport,
}: Props) {
  const [mode, setMode] = useState<Mode>(
    htmlFidele ? "fidele" : "pedagogique"
  );

  const scoreColor =
    integrityScore === null
      ? "bg-gray-200 text-gray-700"
      : integrityScore >= 90
      ? "bg-green-100 text-green-800"
      : integrityScore >= 75
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-green-700">
          {titre}
        </h1>

        <span
          className={`px-4 py-1.5 rounded-full text-sm font-semibold ${scoreColor}`}
        >
          Intégrité : {integrityScore ?? "—"}/100
        </span>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <TabButton
          active={mode === "fidele"}
          disabled={!htmlFidele}
          onClick={() => setMode("fidele")}
        >
          Version originale (identique au PPT)
        </TabButton>

        <TabButton
          active={mode === "pedagogique"}
          disabled={!htmlPedagogique}
          onClick={() => setMode("pedagogique")}
        >
          Mode pédagogique
        </TabButton>

        <TabButton
          active={mode === "audit"}
          disabled={!auditReport}
          onClick={() => setMode("audit")}
        >
          Audit ({auditReport?.issues?.length ?? 0} slides spéciales)
        </TabButton>
      </div>

      {mode === "fidele" && (
        <SupportFrame
          html={htmlFidele}
          empty="Aucun support fidèle publié pour cette séance."
          watermark="SAMO Formation — Usage interne, ne pas diffuser"
        />
      )}

      {mode === "pedagogique" && (
        <SupportFrame html={htmlPedagogique} empty="Aucun HTML pédagogique publié pour cette séance." />
      )}

      {mode === "audit" && (
        <AuditView report={auditReport} />
      )}

      {mode === "fidele" && htmlFidele && (
        <p className="text-xs text-gray-400 mt-3">
          Vue protégée (clic droit et copie désactivés). Une capture d&apos;écran reste
          toujours techniquement possible — aucun outil web ne peut l&apos;empêcher
          totalement.
        </p>
      )}
    </div>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
        active
          ? "border-green-600 text-green-700"
          : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

// Les fichiers générés par render_slides.py / converter_v2.py sont des
// documents HTML complets (<html><head><style>...</style></head><body>...).
// On ne peut pas les injecter tels quels via dangerouslySetInnerHTML : un
// <body> imbriqué dans une div provoque des conflits avec la vraie page
// (attributs qui remontent sur le <body> réel, mismatch d'hydratation).
// On extrait donc juste le <style> et le contenu du <body>.
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

function AuditView({ report }: { report: AuditReport | null }) {
  if (!report || !report.issues || report.issues.length === 0) {
    return (
      <div className="border rounded-xl p-8 text-center text-gray-500 bg-gray-50">
        Aucun rapport d&apos;audit disponible.
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr className="border-b">
            <th className="p-3 text-left">Slide</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-left">Titre</th>
          </tr>
        </thead>
        <tbody>
          {report.issues.map((issue) => (
            <tr key={issue.slide} className="border-b">
              <td className="p-3">{issue.slide}</td>
              <td className="p-3">
                <TypeBadge type={issue.type} />
              </td>
              <td className="p-3 text-gray-700">
                {issue.title ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    PLACEHOLDER: "bg-orange-100 text-orange-800",
    TABLE: "bg-blue-100 text-blue-800",
    TIMELINE: "bg-green-100 text-green-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        styles[type] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {type}
    </span>
  );
}
