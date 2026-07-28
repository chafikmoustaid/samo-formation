"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import MatieresMultiSelect from "@/components/ui/MatieresMultiSelect";

type Role = "admin" | "instructor" | "student";

type Profile = {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  matieres: string[] | null;
  formation_id: number | null;
  nom_complet: string | null;
};

type Formation = {
  id: number;
  nom: string;
  heures_attendues: number | null;
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
  const [newNomComplet, setNewNomComplet] = useState("");
  const [newRole, setNewRole] = useState<Role>("student");
  const [newFormationId, setNewFormationId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [savingNomId, setSavingNomId] = useState<string | null>(null);

  const [settingPasswordId, setSettingPasswordId] = useState<string | null>(
    null
  );

  const [savingMatieresId, setSavingMatieresId] = useState<string | null>(
    null
  );
  const [savingFormationId, setSavingFormationId] = useState<string | null>(
    null
  );
  const [toutesMatieres, setToutesMatieres] = useState<string[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);

  const [formationChoisieId, setFormationChoisieId] = useState<number | null>(
    null
  );
  const [matieresFormation, setMatieresFormation] = useState<string[]>([]);
  const [savingFormationMatieres, setSavingFormationMatieres] =
    useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState<Role | "">("");
  const [filtreFormationId, setFiltreFormationId] = useState<string>("");

  const [busyMatiereCatalogue, setBusyMatiereCatalogue] = useState<
    string | null
  >(null);
  const [busyFormationCatalogue, setBusyFormationCatalogue] = useState<
    number | null
  >(null);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, role, created_at, matieres, formation_id, nom_complet")
      .order("created_at", { ascending: true });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  async function enregistrerNomComplet(id: string, nom: string) {
    setSavingNomId(id);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({ nom_complet: nom.trim() || null })
      .eq("id", id);

    setSavingNomId(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de l'enregistrement du nom : " + error.message,
      });
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, nom_complet: nom.trim() || null } : p))
    );
  }

  async function loadMatieres() {
    const { data } = await supabase
      .from("matieres")
      .select("nom")
      .order("nom", { ascending: true });
    setToutesMatieres((data ?? []).map((m: { nom: string }) => m.nom));
  }

  async function loadFormations() {
    const { data } = await supabase
      .from("formations")
      .select("id, nom, heures_attendues")
      .order("nom", { ascending: true });
    const liste = (data as Formation[]) ?? [];
    setFormations(liste);
    if (liste.length > 0 && formationChoisieId === null) {
      setFormationChoisieId(liste[0].id);
    }
  }

  async function loadMatieresFormation(formationId: number) {
    const { data } = await supabase
      .from("formation_matieres")
      .select("matieres(nom)")
      .eq("formation_id", formationId);
    const noms = (data ?? [])
      .map((row: any) => row.matieres?.nom)
      .filter(Boolean);
    setMatieresFormation(noms);
  }

  useEffect(() => {
    if (formationChoisieId !== null) {
      loadMatieresFormation(formationChoisieId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationChoisieId]);

  async function ajouterMatiere(matiere: string) {
    const { error } = await supabase.rpc("admin_ajouter_matiere", {
      nom_matiere: matiere,
    });
    if (!error) {
      setToutesMatieres((prev) =>
        Array.from(new Set([...prev, matiere])).sort()
      );
    }
  }

  async function enregistrerMatieresFormation(matieres: string[]) {
    if (formationChoisieId === null) return;

    setSavingFormationMatieres(true);
    setMessage(null);

    const { error } = await supabase.rpc("admin_update_formation_matieres", {
      cible_formation_id: formationChoisieId,
      noms_matieres: matieres,
    });

    setSavingFormationMatieres(false);

    if (error) {
      setMessage({
        type: "erreur",
        texte:
          "Erreur lors de l'enregistrement des matières de la formation : " +
          error.message,
      });
      return;
    }

    setMatieresFormation(matieres);
    setMessage({ type: "succes", texte: "Matières de la formation mises à jour." });
  }

  async function enregistrerFormationEtudiant(id: string, formationId: number) {
    setSavingFormationId(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_set_formation", {
      profil_id: id,
      nouvelle_formation_id: formationId,
    });

    setSavingFormationId(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de l'assignation de la formation : " + error.message,
      });
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, formation_id: formationId } : p))
    );
    setMessage({ type: "succes", texte: "Formation assignée." });
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
    loadMatieres();
    loadFormations();
  }, []);

  async function renommerMatiereCatalogue(ancienNom: string, nouveauNom: string) {
    const nom = nouveauNom.trim();
    if (!nom || nom === ancienNom) return;

    setBusyMatiereCatalogue(ancienNom);
    setMessage(null);

    const { error } = await supabase.rpc("admin_renommer_matiere", {
      ancien_nom: ancienNom,
      nouveau_nom: nom,
    });

    setBusyMatiereCatalogue(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors du renommage de la matière : " + error.message,
      });
      return;
    }

    setMessage({ type: "succes", texte: "Matière renommée." });
    loadMatieres();
    loadProfiles();
    if (formationChoisieId !== null) loadMatieresFormation(formationChoisieId);
  }

  async function supprimerMatiereCatalogue(nom: string) {
    const confirmation = window.confirm(
      `Supprimer la matière "${nom}" ? Elle sera retirée de toutes les formations et de tous les comptes qui l'enseignent.`
    );
    if (!confirmation) return;

    setBusyMatiereCatalogue(nom);
    setMessage(null);

    const { error } = await supabase.rpc("admin_supprimer_matiere", {
      nom_matiere: nom,
    });

    setBusyMatiereCatalogue(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de la suppression de la matière : " + error.message,
      });
      return;
    }

    setMessage({ type: "succes", texte: "Matière supprimée." });
    loadMatieres();
    loadProfiles();
    if (formationChoisieId !== null) loadMatieresFormation(formationChoisieId);
  }

  async function renommerFormationCatalogue(id: number, nouveauNom: string) {
    const nom = nouveauNom.trim();
    const actuelle = formations.find((f) => f.id === id);
    if (!nom || nom === actuelle?.nom) return;

    setBusyFormationCatalogue(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_renommer_formation", {
      cible_formation_id: id,
      nouveau_nom: nom,
    });

    setBusyFormationCatalogue(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors du renommage de la formation : " + error.message,
      });
      return;
    }

    setMessage({ type: "succes", texte: "Formation renommée." });
    loadFormations();
    loadProfiles();
  }

  async function enregistrerHeuresAttendues(id: number, valeur: string) {
    const heures = valeur.trim() === "" ? null : Number(valeur);
    if (valeur.trim() !== "" && (Number.isNaN(heures) || Number(heures) < 0)) {
      setMessage({ type: "erreur", texte: "Nombre d'heures invalide." });
      return;
    }

    setBusyFormationCatalogue(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_set_heures_attendues", {
      cible_formation_id: id,
      nouvelles_heures: heures,
    });

    setBusyFormationCatalogue(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de l'enregistrement des heures attendues : " + error.message,
      });
      return;
    }

    setFormations((prev) =>
      prev.map((f) => (f.id === id ? { ...f, heures_attendues: heures } : f))
    );
  }

  async function supprimerFormationCatalogue(id: number, nom: string) {
    const confirmation = window.confirm(
      `Supprimer la formation "${nom}" ? Les étudiants qui y sont inscrits seront détachés (formation à réassigner).`
    );
    if (!confirmation) return;

    setBusyFormationCatalogue(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_supprimer_formation", {
      cible_formation_id: id,
    });

    setBusyFormationCatalogue(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de la suppression de la formation : " + error.message,
      });
      return;
    }

    setMessage({ type: "succes", texte: "Formation supprimée." });
    if (formationChoisieId === id) setFormationChoisieId(null);
    loadFormations();
    loadProfiles();
  }

  const profilesFiltres = profiles.filter((p) => {
    if (filtreRole && p.role !== filtreRole) return false;
    if (filtreFormationId && String(p.formation_id ?? "") !== filtreFormationId)
      return false;

    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase();
      const cible = `${p.email} ${p.nom_complet ?? ""}`.toLowerCase();
      if (!cible.includes(q)) return false;
    }

    return true;
  });

  async function changeRole(id: string, role: Role, email: string) {
    const confirmation = window.confirm(
      `Changer le rôle de ${email} en "${
        role === "admin"
          ? "Administration"
          : role === "instructor"
          ? "Formateur"
          : "Étudiant"
      }" ?`
    );
    if (!confirmation) return;

    setBusyId(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_set_role", {
      profil_id: id,
      nouveau_role: role,
    });

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
          nomComplet: newNomComplet,
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

    if (newRole === "student" && newFormationId) {
      const { data: created } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .single();

      if (created?.id) {
        await supabase.rpc("admin_set_formation", {
          profil_id: created.id,
          nouvelle_formation_id: Number(newFormationId),
        });
      }
    }

    setNewEmail("");
    setNewNomComplet("");
    setNewRole("student");
    setNewFormationId("");
    loadProfiles();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Gestion des comptes"
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
          action={
            <LinkButton href="/dashboard/comptes/historique" variant="outline">
              Historique des changements
            </LinkButton>
          }
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

          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par email ou nom…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
            />
            <select
              value={filtreRole}
              onChange={(e) => setFiltreRole(e.target.value as Role | "")}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tous les rôles</option>
              <option value="student">Étudiant</option>
              <option value="instructor">Formateur</option>
              <option value="admin">Administration</option>
            </select>
            <select
              value={filtreFormationId}
              onChange={(e) => setFiltreFormationId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Toutes les formations</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm">Chargement…</div>
          ) : profilesFiltres.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun compte ne correspond à ces critères.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "980px" }}>
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3 whitespace-nowrap">Email</th>
                  <th className="p-3 whitespace-nowrap">Nom complet</th>
                  <th className="p-3">Formation / Matières</th>
                  <th className="p-3 whitespace-nowrap">Créé le</th>
                  <th className="p-3 whitespace-nowrap">Mot de passe</th>
                  <th className="p-3 border-l border-gray-200 pl-6 text-red-600 whitespace-nowrap">
                    Rôle (sensible)
                  </th>
                </tr>
              </thead>
              <tbody>
                {profilesFiltres.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 align-top">
                    <td className="p-3 whitespace-nowrap">{p.email}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        defaultValue={p.nom_complet ?? ""}
                        placeholder="Nom Prénom"
                        onBlur={(e) => {
                          if (e.target.value !== (p.nom_complet ?? "")) {
                            enregistrerNomComplet(p.id, e.target.value);
                          }
                        }}
                        disabled={savingNomId === p.id}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-full min-w-[160px]"
                      />
                    </td>
                    <td className="p-3">
                      {p.role === "student" ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={p.formation_id ?? ""}
                            onChange={(e) =>
                              enregistrerFormationEtudiant(
                                p.id,
                                Number(e.target.value)
                              )
                            }
                            disabled={savingFormationId === p.id}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm min-w-[220px]"
                          >
                            <option value="" disabled>
                              Choisir une formation
                            </option>
                            {formations.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.nom}
                              </option>
                            ))}
                          </select>
                          {savingFormationId === p.id && (
                            <span className="text-xs text-gray-400">
                              Enregistrement…
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <MatieresMultiSelect
                            options={toutesMatieres}
                            selected={p.matieres ?? []}
                            onChange={(matieres) =>
                              enregistrerMatieres(p.id, matieres)
                            }
                            onAjouterOption={ajouterMatiere}
                          />
                          {savingMatieresId === p.id && (
                            <span className="text-xs text-gray-400">
                              Enregistrement…
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("fr-CA")}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => definirMotDePasse(p.id, p.email)}
                        disabled={settingPasswordId === p.id}
                        className="text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {settingPasswordId === p.id ? "Génération…" : "Regénérer"}
                      </button>
                    </td>
                    <td className="p-3 border-l border-gray-200 pl-6 whitespace-nowrap">
                      <select
                        value={p.role}
                        disabled={busyId === p.id}
                        onChange={(e) =>
                          changeRole(p.id, e.target.value as Role, p.email)
                        }
                        className="border border-gray-200 rounded-lg px-2 py-1"
                      >
                        <option value="student">Étudiant</option>
                        <option value="instructor">Formateur</option>
                        <option value="admin">Administration</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Matières par formation
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Chaque formation (programme) a ses propres matières. Une matière
            peut appartenir à plusieurs formations (tronc commun, ex. Word,
            Excel).
          </p>

          <div className="flex flex-col gap-3 max-w-md">
            <select
              value={formationChoisieId ?? ""}
              onChange={(e) => setFormationChoisieId(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>

            <MatieresMultiSelect
              options={toutesMatieres}
              selected={matieresFormation}
              onChange={enregistrerMatieresFormation}
              onAjouterOption={ajouterMatiere}
            />

            {savingFormationMatieres && (
              <span className="text-xs text-gray-400">Enregistrement…</span>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Catalogue des matières
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Renommer ou supprimer une matière la met à jour partout où elle est
              utilisée (formations, comptes formateurs).
            </p>

            {toutesMatieres.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune matière pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {toutesMatieres.map((matiere) => (
                  <li key={matiere} className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={matiere}
                      onBlur={(e) => renommerMatiereCatalogue(matiere, e.target.value)}
                      disabled={busyMatiereCatalogue === matiere}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => supprimerMatiereCatalogue(matiere)}
                      disabled={busyMatiereCatalogue === matiere}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Catalogue des formations
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Supprimer une formation détache les étudiants qui y sont inscrits
              (à réassigner ensuite). Les heures attendues alimentent la barre
              de progression affichée aux étudiants.
            </p>

            {formations.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune formation pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {formations.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={f.nom}
                      onBlur={(e) => renommerFormationCatalogue(f.id, e.target.value)}
                      disabled={busyFormationCatalogue === f.id}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      defaultValue={f.heures_attendues ?? ""}
                      placeholder="Heures"
                      onBlur={(e) => enregistrerHeuresAttendues(f.id, e.target.value)}
                      disabled={busyFormationCatalogue === f.id}
                      className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => supprimerFormationCatalogue(f.id, f.nom)}
                      disabled={busyFormationCatalogue === f.id}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

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
                Nom complet
              </label>
              <input
                type="text"
                placeholder="Nom Prénom"
                value={newNomComplet}
                onChange={(e) => setNewNomComplet(e.target.value)}
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

            {newRole === "student" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formation
                </label>
                <select
                  value={newFormationId}
                  onChange={(e) => setNewFormationId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Aucune pour l&apos;instant</option>
                  {formations.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button type="submit" disabled={creating}>
              {creating ? "Création…" : "Créer"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
