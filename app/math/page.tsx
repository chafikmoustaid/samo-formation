"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Etat =
  | { type: "chargement" }
  | { type: "ok"; html: string }
  | { type: "refus" }
  | { type: "erreur" };

async function jeton(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function Atelier() {
  const [etat, setEtat] = useState<Etat>({ type: "chargement" });
  const [admin, setAdmin] = useState(false);
  const cadre = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let actif = true;

    async function charger() {
      const t = await jeton();

      if (!t) {
        if (actif) setEtat({ type: "erreur" });
        return;
      }

      try {
        const reponse = await fetch("/api/math", {
          headers: { Authorization: `Bearer ${t}` },
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

  // Synchronisation de la progression avec le serveur : l'atelier (dans le
  // cadre) envoie « sn4:ready » puis « sn4:save » ; on lui répond « sn4:state ».
  useEffect(() => {
    if (etat.type !== "ok") return;

    async function surMessage(e: MessageEvent) {
      if (e.source !== cadre.current?.contentWindow) return;
      const msg = e.data as { type?: string; state?: unknown } | null;
      if (!msg || typeof msg.type !== "string") return;

      const t = await jeton();
      if (!t) return;

      if (msg.type === "sn4:ready") {
        try {
          const r = await fetch("/api/math/progress", {
            headers: { Authorization: `Bearer ${t}` },
          });
          if (!r.ok) return;
          const j = (await r.json()) as { role?: string; data?: unknown };
          setAdmin(j.role === "admin");
          cadre.current?.contentWindow?.postMessage(
            { type: "sn4:state", state: j.data ?? null },
            "*"
          );
        } catch {
          /* la progression locale continue de fonctionner */
        }
      } else if (msg.type === "sn4:save" && msg.state) {
        try {
          await fetch("/api/math/progress", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${t}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: msg.state }),
          });
        } catch {
          /* réessai à la prochaine sauvegarde */
        }
      }
    }

    window.addEventListener("message", surMessage);
    return () => window.removeEventListener("message", surMessage);
  }, [etat.type]);

  if (etat.type === "ok") {
    return (
      <>
        <iframe
          ref={cadre}
          title="Atelier Maths SN4"
          srcDoc={etat.html.replace(
            "<head>",
            // Sans <base>, un lien « #quiz-1 » dans un srcdoc recharge /math
            // dans le cadre, ce que X-Frame-Options: DENY refuse.
            '<head><base href="about:srcdoc">',
          )}
          sandbox="allow-scripts allow-same-origin allow-modals"
          className="fixed inset-0 h-full w-full border-0 bg-white"
        />
        {admin && (
          <Link
            href="/math/suivi"
            className="fixed bottom-4 right-4 z-50 rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-800"
          >
            Suivi
          </Link>
        )}
      </>
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
