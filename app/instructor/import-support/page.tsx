"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function ImportSupportPage() {
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "loading" });

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/instructor/import-support", {
        method: "POST",
        headers: session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus({
          kind: "error",
          message: json.error ?? "Erreur inconnue.",
        });
        return;
      }

      setStatus({
        kind: "success",
        message: `Support publié pour la séance ${sessionId}.`,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Impossible de contacter le serveur.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-8">
        <Link
          href="/instructor"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Portail formateur
        </Link>

        <h1 className="text-3xl font-bold text-green-700 mt-4 mb-2">
          Publier un support de séance
        </h1>

        <p className="text-gray-600 mb-8">
          Génère d&apos;abord les fichiers en local :
          <br />
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">
            python audit.py uploads/Seance_N.pptx
          </code>
          {" puis "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">
            python converter_v2.py uploads/Seance_N.pptx
          </code>
          <br />
          Uploade ensuite les 3 fichiers générés ci-dessous.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-1">
              Numéro de séance (session_id)
            </label>
            <input
              type="number"
              name="session_id"
              required
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              HTML pédagogique — <code>output/seance_N_pedagogique.html</code>
            </label>
            <input
              type="file"
              name="html_pedagogique"
              accept=".html"
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              HTML fidèle — <code>output/seance_N_fidele.html</code>
            </label>
            <input
              type="file"
              name="html_fidele"
              accept=".html"
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Audit (optionnel) — <code>audits/seance_N_audit.json</code>
            </label>
            <input
              type="file"
              name="audit_report"
              accept=".json"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={status.kind === "loading"}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium"
          >
            {status.kind === "loading" ? "Publication..." : "Publier"}
          </button>

          {status.kind === "success" && (
            <div className="p-4 rounded-lg bg-green-50 text-green-800">
              ✅ {status.message}{" "}
              <Link
                href={`/instructor/supports/${sessionId}`}
                className="underline font-medium"
              >
                Voir le support →
              </Link>
            </div>
          )}

          {status.kind === "error" && (
            <div className="p-4 rounded-lg bg-red-50 text-red-800">
              ❌ {status.message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
