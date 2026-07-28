"use client";

import { useEffect, useRef, useState } from "react";

type MatieresMultiSelectProps = {
  options: string[];
  selected: string[];
  onChange: (matieres: string[]) => void;
  onAjouterOption?: (matiere: string) => void;
  libellePluriel?: string;
  texteVide?: string;
  placeholderAjout?: string;
};

export default function MatieresMultiSelect({
  options,
  selected,
  onChange,
  onAjouterOption,
  libellePluriel = "matières",
  texteVide = "Aucune matière pour l'instant.",
  placeholderAjout = "Nouvelle matière",
}: MatieresMultiSelectProps) {
  const [ouvert, setOuvert] = useState(false);
  const [nouvelleMatiere, setNouvelleMatiere] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(matiere: string) {
    if (selected.includes(matiere)) {
      onChange(selected.filter((m) => m !== matiere));
    } else {
      onChange([...selected, matiere]);
    }
  }

  function ajouterMatiere() {
    const nom = nouvelleMatiere.trim();
    if (!nom) return;

    if (!options.includes(nom)) {
      onAjouterOption?.(nom);
    }
    if (!selected.includes(nom)) {
      onChange([...selected, nom]);
    }
    setNouvelleMatiere("");
  }

  return (
    <div className="relative min-w-[220px]" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-left"
      >
        <span className={selected.length ? "text-gray-900" : "text-gray-400"}>
          {selected.length > 0
            ? selected.join(", ")
            : `Sélectionner les ${libellePluriel}`}
        </span>
        <span className="text-gray-400 ml-2">▾</span>
      </button>

      {ouvert && (
        <div className="absolute z-10 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {options.length === 0 && (
              <p className="text-sm text-gray-400">{texteVide}</p>
            )}
            {options.map((matiere) => (
              <label
                key={matiere}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(matiere)}
                  onChange={() => toggle(matiere)}
                />
                {matiere}
              </label>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={nouvelleMatiere}
              onChange={(e) => setNouvelleMatiere(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouterMatiere();
                }
              }}
              placeholder={placeholderAjout}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={ajouterMatiere}
              disabled={!nouvelleMatiere.trim()}
              className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
