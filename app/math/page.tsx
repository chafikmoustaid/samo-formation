"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Etat =
  | { type: "chargement" }
  | { type: "ok"; html: string }
  | { type: "refus" }
  | { type: "erreur" };

function Atelier() {
  const [etat, setEtat] = useState<Etat>({ type: "chargement" });

  useEffect(() => {
    let actif = true;

    async function charger() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (actif) setEtat({ type: "erreur" });
        return;
      }

      try {
        const reponse = await fetch("/api/math", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!actif) return;

        if (reponse.status === 403) {
          setEtat({ type: "refus" });
        } else if (!reponse.ok) {
          setEtat({ type: "erreur" });
        } else {
          setEtat({ type: "ok", html: await reponse.text() });
        }
      } catch {
        if (actif) setEtat({ type: "erreur" });
      }
    }

    charger();

    return () => {
      actif = false;
    };
  }, []);

  if (etat.type === "ok") {
    return (
      <iframe
        title="Atelier Maths SN4"
        srcDoc={etat.html.replace(
          "<head>",
          // Sans <base>, un lien « #quiz-1 » dans un srcdoc recharge /math
          // dans le cadre, ce que X-Frame-Options: DENY refuse.
          '<head><base href="about:srcdoc">',
        )}
        sandbox="allow-scripts allow-same-origin"
        className="fixed inset-0 h-full w-full border-0 bg-white"
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center">
        {etat.type === "chargement" && (
          <p className="text-gray-500">Chargement...</p>
        )}
        {etat.type === "refus" && (
          <>
            <h1 className="text-xl font-semibold text-gray-900">
              Accès non autorisé
            </h1>
            <p className="mt-2 text-gray-600">
              Ce compte n&apos;a pas accès à cette page. Contacte
              l&apos;administration pour demander l&apos;accès.
            </p>
            <Link href="/" className="mt-4 inline-block text-green-700 underline">
              Retour à l&apos;accueil
            </Link>
          </>
        )}
        {etat.type === "erreur" && (
          <>
            <h1 className="text-xl font-semibold text-gray-900">
              Impossible de charger la page
            </h1>
            <p className="mt-2 text-gray-600">
              Recharge la page ou reconnecte-toi.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function MathPage() {
  return (
    <AuthGuard allowedRoles={["admin", "instructor", "student"]}>
      <Atelier />
    </AuthGuard>
  );
}
