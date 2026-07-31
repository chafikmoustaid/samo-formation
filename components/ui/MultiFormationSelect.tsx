"use client";

import { useEffect, useRef, useState } from "react";

type Formation = { id: number; nom: string };

// Sélecteur multi-formations compact : un simple bouton qui ouvre un
// panneau flottant (position absolue), donc la hauteur de la ligne et la
// largeur de la colonne du tableau ne bougent jamais, peu importe combien
// de formations sont assignées.
export default function MultiFormationSelect({
  formations,
  selectionIds,
  onChange,
  disabled,
  saving,
}: {
  formations: Formation[];
  selectionIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  saving?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(e.target as Node)
      ) {
        setOuvert(false);
      }
    }
    if (ouvert) document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  const nomsSelectionnes = formations
    .filter((f) => selectionIds.includes(f.id))
    .map((f) => f.nom);

  const libelle =
    nomsSelectionnes.length === 0
      ? "Aucune formation"
      : nomsSelectionnes.length === 1
      ? nomsSelectionnes[0]
      : `${nomsSelectionnes.length} formations`;

  function basculer(id: number) {
    if (selectionIds.includes(id)) {
      onChange(selectionIds.filter((x) => x !== id));
    } else {
      onChange([...selectionIds, id]);
    }
  }

  return (
    <div className="relative w-full" ref={conteneurRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOuvert((v) => !v)}
        title={nomsSelectionnes.join(", ") || undefined}
        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-left truncate bg-white disabled:bg-gray-50 disabled:text-gray-400"
      >
        {saving ? "Enregistrement…" : libelle}
      </button>

      {ouvert && (
        <div className="absolute z-20 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          {formations.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-1">
              Aucune formation créée.
            </p>
          ) : (
            formations.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectionIds.includes(f.id)}
                  onChange={() => basculer(f.id)}
                />
                <span className="truncate">{f.nom}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
