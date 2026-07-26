"use client";

import { useState } from "react";

type Mode = "enonce" | "corrige";

export default function TpCompare({
  titre,
  contenuHtml,
  corrigeHtml,
  description,
}: {
  titre: string;
  contenuHtml: string | null;
  corrigeHtml: string | null;
  description: string | null;
}) {
  const [mode, setMode] = useState<Mode>("enonce");

  return (
    <div>
      <h1 className="text-3xl font-bold text-green-700 mb-4">{titre}</h1>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setMode("enonce")}
          className={`px-4 py-2 font-semibold ${
            mode === "enonce"
              ? "border-b-2 border-green-600 text-green-700"
              : "text-gray-500"
          }`}
        >
          Énoncé (vu par l&apos;étudiant)
        </button>

        <button
          onClick={() => setMode("corrige")}
          className={`px-4 py-2 font-semibold ${
            mode === "corrige"
              ? "border-b-2 border-yellow-600 text-yellow-700"
              : "text-gray-500"
          }`}
        >
          Corrigé (réservé au formateur)
        </button>
      </div>

      {mode === "enonce" &&
        (contenuHtml ? (
          <div
            className="tp-content"
            dangerouslySetInnerHTML={{ __html: contenuHtml }}
          />
        ) : (
          <p>{description ?? "Aucun contenu disponible."}</p>
        ))}

      {mode === "corrige" &&
        (corrigeHtml ? (
          <div
            className="tp-content tp-content-corrige"
            dangerouslySetInnerHTML={{ __html: corrigeHtml }}
          />
        ) : (
          <p>Aucun corrigé disponible.</p>
        ))}
    </div>
  );
}
