"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

type SignaturePadProps = {
  onSave: (signature: string) => void;
};

export default function SignaturePad({
  onSave,
}: SignaturePadProps) {
  const sigCanvas =
    useRef<SignatureCanvas | null>(null);

  const saveSignature = () => {
    if (!sigCanvas.current) return;

    const signature =
      sigCanvas.current
        .getTrimmedCanvas()
        .toDataURL("image/png");

    onSave(signature);
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  return (
    <div>
      <SignatureCanvas
        ref={sigCanvas}
        penColor="black"
        canvasProps={{
          width: 500,
          height: 180,
          className:
            "border rounded-lg bg-white",
        }}
      />

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
    </div>
  );
}