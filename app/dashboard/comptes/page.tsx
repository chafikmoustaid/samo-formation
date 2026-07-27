"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "instructor" | "student";

type Profile = {
  id: string;
  email: string;
  role: Role;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function ComptesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    texte: string;
    type: "succes" | "erreur";
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("student");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: true });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
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
    if (!passwordInput || passwordInput.length < 6) {
      setMessage({
        type: "erreur",
        texte: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }

    setSettingPassword(true);
    setMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    let result: { error?: string; success?: boolean } = {};

    try {
      const response = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ userId: id, password: passwordInput }),
      });

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      setSettingPassword(false);

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
      setSettingPassword(false);
      setMessage({
        type: "erreur",
        texte:
          "Erreur réseau lors de la mise à jour du mot de passe : " +
          (err instanceof Error ? err.message : "erreur inconnue"),
      });
      return;
    }

    setEditingId(null);
    setPasswordInput("");
    setMessage({
      type: "succes",
      texte: `Mot de passe mis à jour pour ${email}.`,
    });
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    // Client temporaire qui ne persiste pas la session, pour ne pas
    // écraser la session de l'administrateur actuellement connecté.
    const tempClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await tempClient.auth.signUp({
      email: newEmail,
      password: newPassword,
    });

    if (error || !data.user) {
      setCreateError(error?.message ?? "Erreur inconnue lors de la création.");
      setCreating(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email: newEmail,
      role: newRole,
    });

    setCreating(false);

    if (profileError) {
      setCreateError(
        "Compte créé mais profil non enregistré : " + profileError.message
      );
      return;
    }

    setNewEmail("");
    setNewPassword("");
    setNewRole("student");
    setMessage({ type: "succes", texte: `Compte créé pour ${newEmail}.` });
    loadProfiles();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-green-700">
            Gestion des comptes
          </h1>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ← Retour au tableau de bord
          </Link>
        </div>

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

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Comptes existants</h2>

          {loading ? (
            <div className="text-gray-500 text-sm">Chargement…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3">Email</th>
                  <th className="p-3">Rôle</th>
                  <th className="p-3">Créé le</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
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
                    <td className="p-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString("fr-CA")}
                    </td>
                    <td className="p-3">
                      {editingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Nouveau mot de passe"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => definirMotDePasse(p.id, p.email)}
                            disabled={settingPassword}
                            className="text-green-700 hover:underline disabled:opacity-50"
                          >
                            {settingPassword ? "…" : "Enregistrer"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setPasswordInput("");
                            }}
                            className="text-gray-400 hover:underline"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setPasswordInput("");
                            setMessage(null);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Nouveau mot de passe
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Créer un compte</h2>

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
                Mot de passe provisoire
              </label>
              <input
                type="text"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={creating}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-medium"
            >
              {creating ? "Création…" : "Créer"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
