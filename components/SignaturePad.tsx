"use client";

import { useState, useRef } from "react";
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
      <div className="inline-flex mb-4 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {onglets.map((onglet) => (
          <button
            key={onglet.valeur}
            type="button"
            onClick={() => {
              setMode(onglet.valeur);
              setEnregistre(false);
            }}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === onglet.valeur
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {onglet.label}
          </button>
        ))}
      </div>

      {mode === "enregistree" && signatureEnregistree ? (
        <div>
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
        <>
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: 500,
              height: 180,
              className: "border border-gray-300 rounded-lg bg-white",
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
        </>
      ) : mode === "texte" ? (
        <div>
          <input
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

      {enregistre && (
        <p className="mt-2 text-sm text-green-700">Signature enregistrée.</p>
      )}
    </div>
  );
}
