"use client";

import { useId, useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import Button from "@/components/ui/Button";

type SignaturePadProps = {
  onSave: (signature: string) => void;
  nomParDefaut?: string;
  signatureEnregistree?: string | null;
  onEnregistrerPreference?: (signature: string) => void;
};

export default function SignaturePad({
  onSave,
  nomParDefaut = "",
  signatureEnregistree = null,
  onEnregistrerPreference,
}: SignaturePadProps) {
  const [mode, setMode] = useState<"enregistree" | "dessiner" | "texte">(
    signatureEnregistree ? "enregistree" : "dessiner"
  );
  const [nomTape, setNomTape] = useState(nomParDefaut);
  const [enregistre, setEnregistre] = useState(false);
  const [memoriser, setMemoriser] = useState(false);

  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const idBase = useId();
  const idNomTape = `${idBase}-nom-tape`;

  const utiliserSignatureEnregistree = () => {
    if (!signatureEnregistree) return;
    onSave(signatureEnregistree);
    setEnregistre(true);
  };

  const saveSignature = () => {
    if (!sigCanvas.current) return;

    const signature = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");

    onSave(signature);
    setEnregistre(true);

    if (memoriser) {
      onEnregistrerPreference?.(signature);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setEnregistre(false);
  };

  function enregistrerNomTape() {
    if (!nomTape.trim()) return;

    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 180;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "italic 52px 'Brush Script MT', 'Segoe Script', cursive";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(nomTape.trim(), canvas.width / 2, canvas.height / 2);

    const signature = canvas.toDataURL("image/png");
    onSave(signature);
    setEnregistre(true);

    if (memoriser) {
      onEnregistrerPreference?.(signature);
    }
  }

  const onglets: { valeur: typeof mode; label: string }[] = [
    ...(signatureEnregistree
      ? [{ valeur: "enregistree" as const, label: "Signature enregistrée" }]
      : []),
    { valeur: "dessiner" as const, label: "Dessiner" },
    { valeur: "texte" as const, label: "Écrire mon nom" },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Mode de signature"
        className="inline-flex gap-2 mb-4"
      >
        {onglets.map((onglet) => (
          <button
            key={onglet.valeur}
            type="button"
            role="tab"
            aria-selected={mode === onglet.valeur}
            aria-controls={`${idBase}-panel-${onglet.valeur}`}
            id={`${idBase}-tab-${onglet.valeur}`}
            onClick={() => {
              setMode(onglet.valeur);
              setEnregistre(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              mode === onglet.valeur
                ? "bg-green-700 text-white border-green-700 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
            }`}
          >
            {onglet.label}
          </button>
        ))}
      </div>

      {mode === "enregistree" && signatureEnregistree ? (
        <div
          role="tabpanel"
          id={`${idBase}-panel-enregistree`}
          aria-labelledby={`${idBase}-tab-enregistree`}
        >
          <img
            src={signatureEnregistree}
            alt="Signature enregistrée"
            className="border border-gray-200 rounded-lg bg-white h-24"
          />
          <div className="mt-3">
            <Button type="button" onClick={utiliserSignatureEnregistree}>
              Utiliser cette signature
            </Button>
          </div>
        </div>
      ) : mode === "dessiner" ? (
        <div
          role="tabpanel"
          id={`${idBase}-panel-dessiner`}
          aria-labelledby={`${idBase}-tab-dessiner`}
        >
          <p className="text-xs text-gray-500 mb-2">
            Cette zone se dessine à la souris ou au doigt. Si tu utilises le
            clavier ou un lecteur d&apos;écran, utilise plutôt l&apos;onglet
            « Écrire mon nom ».
          </p>

          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: 500,
              height: 180,
              className: "border border-gray-300 rounded-lg bg-white",
              "aria-label":
                "Zone de dessin de la signature (souris ou écran tactile requis)",
              role: "img",
            }}
          />

          {onEnregistrerPreference && (
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={memoriser}
                onChange={(e) => setMemoriser(e.target.checked)}
              />
              Mémoriser cette signature pour mes prochaines fiches
            </label>
          )}

          <div className="flex gap-3 mt-3">
            <Button type="button" onClick={saveSignature}>
              Enregistrer la signature
            </Button>

            <Button type="button" variant="outline" onClick={clearSignature}>
              Effacer
            </Button>
          </div>
        </div>
      ) : mode === "texte" ? (
        <div
          role="tabpanel"
          id={`${idBase}-panel-texte`}
          aria-labelledby={`${idBase}-tab-texte`}
        >
          <label htmlFor={idNomTape} className="block text-sm font-medium text-gray-700 mb-1">
            Ton nom complet
          </label>
          <input
            id={idNomTape}
            type="text"
            value={nomTape}
            onChange={(e) => {
              setNomTape(e.target.value);
              setEnregistre(false);
            }}
            placeholder="Tapez votre nom complet"
            className="w-full max-w-[500px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          {nomTape.trim() && (
            <div
              className="w-full max-w-[500px] border rounded-lg bg-white mt-3 flex items-center justify-center"
              style={{ height: 120 }}
            >
              <span
                style={{
                  fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                  fontStyle: "italic",
                  fontSize: 40,
                }}
              >
                {nomTape}
              </span>
            </div>
          )}

          {onEnregistrerPreference && (
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={memoriser}
                onChange={(e) => setMemoriser(e.target.checked)}
              />
              Mémoriser cette signature pour mes prochaines fiches
            </label>
          )}

          <div className="mt-3">
            <Button
              type="button"
              onClick={enregistrerNomTape}
              disabled={!nomTape.trim()}
            >
              Utiliser cette signature
            </Button>
          </div>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="mt-2 text-sm text-green-700">
        {enregistre ? "Signature enregistrée." : ""}
      </p>
    </div>
  );
}
