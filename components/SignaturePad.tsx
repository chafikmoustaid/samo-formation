"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

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

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {signatureEnregistree && (
          <button
            type="button"
            onClick={() => {
              setMode("enregistree");
              setEnregistre(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "enregistree"
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ⭐ Ma signature enregistrée
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode("dessiner");
            setEnregistre(false);
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "dessiner"
              ? "bg-green-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ✍️ Dessiner
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("texte");
            setEnregistre(false);
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "texte"
              ? "bg-green-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ⌨️ Écrire mon nom
        </button>
      </div>

      {mode === "enregistree" && signatureEnregistree ? (
        <div>
          <img
            src={signatureEnregistree}
            alt="Signature enregistrée"
            className="border rounded-lg bg-white h-24"
          />
          <div className="mt-3">
            <button
              type="button"
              onClick={utiliserSignatureEnregistree}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Utiliser cette signature
            </button>
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
              className: "border rounded-lg bg-white",
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
            <button
              type="button"
              onClick={saveSignature}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Enregistrer la signature
            </button>

            <button
              type="button"
              onClick={clearSignature}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Effacer
            </button>
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
            <button
              type="button"
              onClick={enregistrerNomTape}
              disabled={!nomTape.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
            >
              Utiliser cette signature
            </button>
          </div>
        </div>
      ) : null}

      {enregistre && (
        <p className="mt-2 text-sm text-green-700">✓ Signature enregistrée.</p>
      )}
    </div>
  );
}
