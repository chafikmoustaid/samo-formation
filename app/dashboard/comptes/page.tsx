"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import MatieresMultiSelect from "@/components/ui/MatieresMultiSelect";

type Role = "admin" | "instructor" | "student";

type Profile = {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  matieres: string[] | null;
};

export default function ComptesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    texte: string;
    type: "succes" | "erreur";
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [generatedPassword, setGeneratedPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("student");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [settingPasswordId, setSettingPasswordId] = useState<string | null>(
    null
  );

  const [savingMatieresId, setSavingMatieresId] = useState<string | null>(
    null
  );
  const [toutesMatieres, setToutesMatieres] = useState<string[]>([]);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, role, created_at, matieres")
      .order("created_at", { ascending: true });
    const liste = (data as Profile[]) ?? [];
    setProfiles(liste);

    const union = new Set<string>();
    liste.forEach((p) => (p.matieres ?? []).forEach((m) => union.add(m)));
    setToutesMatieres((prev) => Array.from(new Set([...prev, ...union])).sort());

    setLoading(false);
  }

  async function enregistrerMatieres(id: string, matieres: string[]) {
    setSavingMatieresId(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_update_matieres", {
      profil_id: id,
      nouvelles_matieres: matieres,
    });

    setSavingMatieresId(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de l'enregistrement des matières : " + error.message,
      });
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, matieres } : p))
    );
    setMessage({ type: "succes", texte: "Matières mises à jour." });
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function changeRole(id: string, role: Role) {
    setBusyId(id);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);

    setBusyId(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors du changement de rôle : " + error.message,
      });
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role } : p))
    );
    setMessage({ type: "succes", texte: "Rôle mis à jour." });
  }

  async function definirMotDePasse(id: string, email: string) {
    setSettingPasswordId(id);
    setMessage(null);
    setGeneratedPassword(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    let result: { error?: string; success?: boolean; password?: string } = {};

    try {
      const response = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ userId: id }),
      });

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      setSettingPasswordId(null);

      if (!response.ok) {
        setMessage({
          type: "erreur",
          texte:
            "Erreur lors de la mise à jour du mot de passe : " +
            (result.error ?? `réponse serveur invalide (code ${response.status})`),
        });
        return;
      }
    } catch (err) {
      setSettingPasswordId(null);
      setMessage({
        type: "erreur",
        texte:
          "Erreur réseau lors de la mise à jour du mot de passe : " +
          (err instanceof Error ? err.message : "erreur inconnue"),
      });
      return;
    }

    if (result.password) {
      setGeneratedPassword({ email, password: result.password });
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    setGeneratedPassword(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    let result: { error?: string; success?: boolean; password?: string } = {};

    try {
      const response = await fetch("/api/admin/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
        }),
      });

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      setCreating(false);

      if (!response.ok) {
        setCreateError(
          result.error ?? `réponse serveur invalide (code ${response.status})`
        );
        return;
      }
    } catch (err) {
      setCreating(false);
      setCreateError(
        "Erreur réseau lors de la création : " +
          (err instanceof Error ? err.message : "erreur inconnue")
      );
      return;
    }

    if (result.password) {
      setGeneratedPassword({ email: newEmail, password: result.password });
    }

    setNewEmail("");
    setNewRole("student");
    loadProfiles();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Gestion des comptes"
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
        />

        {generatedPassword && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4">
            <p className="text-sm text-amber-900 mb-2">
              Mot de passe temporaire pour <strong>{generatedPassword.email}</strong> —
              note-le maintenant, il ne sera plus jamais affiché. La personne
              devra le changer à sa première connexion.
            </p>
            <div className="flex items-center gap-3">
              <code className="bg-white border border-amber-200 rounded px-3 py-2 font-mono text-lg tracking-wide">
                {generatedPassword.password}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(generatedPassword.password);
                  setMessage({ type: "succes", texte: "Mot de passe copié." });
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Copier
              </button>
              <button
                onClick={() => setGeneratedPassword(null)}
                className="text-sm text-gray-400 hover:underline"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mb-6 text-sm rounded-lg px-4 py-3 border ${
              message.type === "erreur"
                ? "bg-red-50 border-red-100 text-red-700"
                : "bg-green-50 border-green-100 text-green-700"
            }`}
          >
            {message.texte}
          </div>
        )}

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comptes existants</h2>

          {loading ? (
            <div className="text-gray-500 text-sm">Chargement…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3">Email</th>
                  <th className="p-3">Rôle</th>
                  <th className="p-3">Matières enseignées</th>
                  <th className="p-3">Créé le</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 align-top">
                    <td className="p-3">{p.email}</td>
                    <td className="p-3">
                      <select
                        value={p.role}
                        disabled={busyId === p.id}
                        onChange={(e) =>
                          changeRole(p.id, e.target.value as Role)
                        }
                        className="border border-gray-200 rounded-lg px-2 py-1"
                      >
                        <option value="student">Étudiant</option>
                        <option value="instructor">Formateur</option>
                        <option value="admin">Administration</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {p.role === "instructor" || p.role === "admin" ? (
                        <div className="flex flex-col gap-2">
                          <MatieresMultiSelect
                            options={toutesMatieres}
                            selected={p.matieres ?? []}
                            onChange={(matieres) =>
                              enregistrerMatieres(p.id, matieres)
                            }
                            onAjouterOption={(matiere) =>
                              setToutesMatieres((prev) =>
                                Array.from(new Set([...prev, matiere])).sort()
                              )
                            }
                          />
                          {savingMatieresId === p.id && (
                            <span className="text-xs text-gray-400">
                              Enregistrement…
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString("fr-CA")}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => definirMotDePasse(p.id, p.email)}
                        disabled={settingPasswordId === p.id}
                        className="text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {settingPasswordId === p.id
                          ? "Génération…"
                          : "Générer un nouveau mot de passe"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Créer un compte</h2>
          <p className="text-sm text-gray-500 mb-4">
            Un mot de passe temporaire est généré automatiquement ; la
            personne devra le changer à sa première connexion.
          </p>

          {createError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {createError}
            </div>
          )}

          <form onSubmit={createAccount} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="student">Étudiant</option>
                <option value="instructor">Formateur</option>
                <option value="admin">Administration</option>
              </select>
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? "Création…" : "Créer"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
