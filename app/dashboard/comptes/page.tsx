"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import MultiFormationSelect from "@/components/ui/MultiFormationSelect";

type Role = "admin" | "instructor" | "student";

// Largeurs (en px) des colonnes du tableau "Comptes existants", dans
// l'ordre Email / Nom complet / Formation / Créé le / Mot de passe / Rôle /
// Actions. L'admin peut les ajuster en glissant le bord droit d'un
// en-tête ; le résultat est mémorisé pour les prochaines visites.
const LARGEURS_COLONNES_PAR_DEFAUT = [216, 180, 264, 84, 108, 156, 192];
const CLE_LARGEURS_COLONNES = "samo_dashboard_comptes_largeurs_colonnes";

type Profile = {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  matieres: string[] | null;
  formation_id: number | null;
  nom_complet: string | null;
  desactive_le: string | null;
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
  const [monId, setMonId] = useState<string | null>(null);
  const [voirCorbeille, setVoirCorbeille] = useState(false);
  const [busyArchiveId, setBusyArchiveId] = useState<string | null>(null);
  const [busySuppressionId, setBusySuppressionId] = useState<string | null>(
    null
  );

  const [largeursColonnes, setLargeursColonnes] = useState<number[]>(
    LARGEURS_COLONNES_PAR_DEFAUT
  );
  const redimensionnementRef = useRef<{
    index: number;
    startX: number;
    startWidth: number;
  } | null>(null);

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
  const [formationsFormateurs, setFormationsFormateurs] = useState<
    Map<string, number[]>
  >(new Map());
  const [savingFormateurFormationsId, setSavingFormateurFormationsId] =
    useState<string | null>(null);

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

  const [nouvelleMatiere, setNouvelleMatiere] = useState("");
  const [ajoutMatiereEnCours, setAjoutMatiereEnCours] = useState(false);
  const [filtrerMatieresParFormation, setFiltrerMatieresParFormation] =
    useState(true);
  const [nouvelleFormation, setNouvelleFormation] = useState("");
  const [ajoutFormationEnCours, setAjoutFormationEnCours] = useState(false);

  const [formationsARenommer, setFormationsARenommer] = useState<Set<number>>(
    new Set()
  );
  const [formationsASupprimer, setFormationsASupprimer] = useState<
    Set<number>
  >(new Set());
  const [matieresARenommer, setMatieresARenommer] = useState<Set<string>>(
    new Set()
  );
  const [matieresASupprimer, setMatieresASupprimer] = useState<Set<string>>(
    new Set()
  );

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, email, role, created_at, matieres, formation_id, nom_complet, desactive_le"
      )
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

  async function loadFormationsFormateurs() {
    const { data } = await supabase
      .from("instructor_formations")
      .select("profil_id, formation_id");

    const map = new Map<string, number[]>();
    for (const row of (data as { profil_id: string; formation_id: number }[]) ?? []) {
      const liste = map.get(row.profil_id) ?? [];
      liste.push(row.formation_id);
      map.set(row.profil_id, liste);
    }
    setFormationsFormateurs(map);
  }

  async function enregistrerFormationsFormateur(id: string, formationIds: number[]) {
    setSavingFormateurFormationsId(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_set_instructor_formations", {
      profil_id: id,
      formation_ids: formationIds,
    });

    setSavingFormateurFormationsId(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de l'assignation des formations : " + error.message,
      });
      return;
    }

    setFormationsFormateurs((prev) => {
      const next = new Map(prev);
      next.set(id, formationIds);
      return next;
    });
    setMessage({ type: "succes", texte: "Formations du formateur mises à jour." });
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
    setMatieresARenommer(new Set());
    setMatieresASupprimer(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationChoisieId, filtrerMatieresParFormation]);

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
    loadFormationsFormateurs();
    supabase.auth.getUser().then(({ data }) => setMonId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    try {
      const sauvegarde = window.localStorage.getItem(CLE_LARGEURS_COLONNES);
      if (!sauvegarde) return;
      const valeurs = JSON.parse(sauvegarde);
      if (
        Array.isArray(valeurs) &&
        valeurs.length === LARGEURS_COLONNES_PAR_DEFAUT.length &&
        valeurs.every((v) => typeof v === "number" && v > 0)
      ) {
        // Volontaire : on ne peut pas lire localStorage pendant le rendu
        // serveur (SSR), donc l'état démarre avec les largeurs par défaut
        // (identiques des deux côtés, pas de decalage d'hydratation) et
        // n'est ajusté qu'ici, une fois côté client.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLargeursColonnes(valeurs);
      }
    } catch {
      // stockage indisponible ou corrompu — on garde les largeurs par défaut
    }
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const etat = redimensionnementRef.current;
      if (!etat) return;
      const delta = e.clientX - etat.startX;
      setLargeursColonnes((prev) => {
        const next = [...prev];
        next[etat.index] = Math.max(60, etat.startWidth + delta);
        return next;
      });
    }

    function onMouseUp() {
      if (!redimensionnementRef.current) return;
      redimensionnementRef.current = null;
      setLargeursColonnes((actuelles) => {
        try {
          window.localStorage.setItem(
            CLE_LARGEURS_COLONNES,
            JSON.stringify(actuelles)
          );
        } catch {
          // navigation privée ou stockage plein — pas bloquant
        }
        return actuelles;
      });
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function demarrerRedimensionnement(index: number, e: React.MouseEvent) {
    e.preventDefault();
    redimensionnementRef.current = {
      index,
      startX: e.clientX,
      startWidth: largeursColonnes[index],
    };
  }

  async function archiverCompte(id: string, email: string) {
    const confirmation = window.confirm(
      `Archiver le compte ${email} ? La personne ne pourra plus se connecter, mais rien n'est perdu — tu peux restaurer le compte à tout moment depuis "Voir la corbeille".`
    );
    if (!confirmation) return;

    setBusyArchiveId(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_archiver_compte", {
      profil_id: id,
    });

    setBusyArchiveId(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de l'archivage : " + error.message,
      });
      return;
    }

    setMessage({ type: "succes", texte: "Compte archivé." });
    loadProfiles();
  }

  async function restaurerCompte(id: string) {
    setBusyArchiveId(id);
    setMessage(null);

    const { error } = await supabase.rpc("admin_restaurer_compte", {
      profil_id: id,
    });

    setBusyArchiveId(null);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de la restauration : " + error.message,
      });
      return;
    }

    setMessage({ type: "succes", texte: "Compte restauré." });
    loadProfiles();
  }

  async function supprimerCompteDefinitivement(id: string, email: string) {
    const confirmation = window.confirm(
      `Supprimer DÉFINITIVEMENT le compte ${email} ? Cette action est irréversible : le compte et sa connexion seront détruits (l'historique des fiches de présence, lui, reste intact). Si tu n'es pas certain, préfère "Archiver".`
    );
    if (!confirmation) return;

    setBusySuppressionId(id);
    setMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    let result: { error?: string; success?: boolean } = {};

    try {
      const response = await fetch("/api/admin/delete-account", {
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

      setBusySuppressionId(null);

      if (!response.ok) {
        setMessage({
          type: "erreur",
          texte:
            "Erreur lors de la suppression : " +
            (result.error ?? `réponse serveur invalide (code ${response.status})`),
        });
        return;
      }
    } catch (err) {
      setBusySuppressionId(null);
      setMessage({
        type: "erreur",
        texte:
          "Erreur réseau lors de la suppression : " +
          (err instanceof Error ? err.message : "erreur inconnue"),
      });
      return;
    }

    setMessage({ type: "succes", texte: "Compte supprimé définitivement." });
    loadProfiles();
  }

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

  async function ajouterMatiereCatalogue() {
    const nom = nouvelleMatiere.trim();
    if (!nom) return;

    setAjoutMatiereEnCours(true);
    setMessage(null);

    const { error } = await supabase.rpc("admin_ajouter_matiere", {
      nom_matiere: nom,
    });

    setAjoutMatiereEnCours(false);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de l'ajout de la matière : " + error.message,
      });
      return;
    }

    setNouvelleMatiere("");
    loadMatieres();

    // Si on est en train de gérer les matières d'une formation précise,
    // la nouvelle matière lui est directement assignée.
    if (formationChoisieId !== null && filtrerMatieresParFormation) {
      await enregistrerMatieresFormation([...matieresFormation, nom]);
      setMessage({
        type: "succes",
        texte: "Matière créée et assignée à la formation.",
      });
    } else {
      setMessage({ type: "succes", texte: "Matière ajoutée." });
    }
  }

  async function assignerMatiereAFormation(nomMatiere: string) {
    if (formationChoisieId === null) return;
    if (matieresFormation.includes(nomMatiere)) return;
    await enregistrerMatieresFormation([...matieresFormation, nomMatiere]);
  }

  async function retirerMatiereDeFormation(nomMatiere: string) {
    if (formationChoisieId === null) return;
    await enregistrerMatieresFormation(
      matieresFormation.filter((m) => m !== nomMatiere)
    );
  }

  async function creerFormationCatalogue() {
    const nom = nouvelleFormation.trim();
    if (!nom) return;

    setAjoutFormationEnCours(true);
    setMessage(null);

    const { error } = await supabase.rpc("admin_creer_formation", {
      nom_formation: nom,
      heures_attendues: null,
    });

    setAjoutFormationEnCours(false);

    if (error) {
      setMessage({
        type: "erreur",
        texte: "Erreur lors de la création de la formation : " + error.message,
      });
      return;
    }

    setNouvelleFormation("");
    setMessage({ type: "succes", texte: "Formation créée." });
    loadFormations();
  }

  async function supprimerFormationCatalogue(id: number, nom: string) {
    const confirmation = window.confirm(
      `Supprimer la formation "${nom}" ? Les étudiants qui y sont inscrits seront détachés.`
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

  function basculerCase(
    set: Set<any>,
    setter: (s: Set<any>) => void,
    valeur: any
  ) {
    const next = new Set(set);
    if (next.has(valeur)) next.delete(valeur);
    else next.add(valeur);
    setter(next);
  }

  async function renommerFormationsCochees() {
    if (formationsARenommer.size !== 1) {
      setMessage({
        type: "erreur",
        texte: "Coche exactement une formation à renommer.",
      });
      return;
    }

    const id = Array.from(formationsARenommer)[0];
    const actuelle = formations.find((f) => f.id === id);
    const nouveauNom = window.prompt("Nouveau nom de la formation :", actuelle?.nom ?? "");
    if (nouveauNom === null) return;

    await renommerFormationCatalogue(id, nouveauNom);
    setFormationsARenommer(new Set());
  }

  async function supprimerFormationsCochees() {
    if (formationsASupprimer.size === 0) return;

    const noms = formations
      .filter((f) => formationsASupprimer.has(f.id))
      .map((f) => f.nom);

    const confirmation = window.confirm(
      `Supprimer ${noms.length > 1 ? "les formations" : "la formation"} "${noms.join(
        '", "'
      )}" ? Les étudiants qui y sont inscrits seront détachés.`
    );
    if (!confirmation) return;

    setMessage(null);

    for (const id of formationsASupprimer) {
      const { error } = await supabase.rpc("admin_supprimer_formation", {
        cible_formation_id: id,
      });
      if (error) {
        setMessage({
          type: "erreur",
          texte: "Erreur lors de la suppression de la formation : " + error.message,
        });
      }
      if (formationChoisieId === id) setFormationChoisieId(null);
    }

    setFormationsASupprimer(new Set());
    setFormationsARenommer(new Set());
    setMessage((prev) => prev ?? { type: "succes", texte: "Formation(s) supprimée(s)." });
    loadFormations();
    loadProfiles();
  }

  async function renommerMatieresCochees() {
    if (matieresARenommer.size !== 1) {
      setMessage({
        type: "erreur",
        texte: "Coche exactement une matière à renommer.",
      });
      return;
    }

    const ancienNom = Array.from(matieresARenommer)[0];
    const nouveauNom = window.prompt("Nouveau nom de la matière :", ancienNom);
    if (nouveauNom === null) return;

    await renommerMatiereCatalogue(ancienNom, nouveauNom);
    setMatieresARenommer(new Set());
  }

  async function supprimerMatieresCochees() {
    if (matieresASupprimer.size === 0) return;

    const noms = Array.from(matieresASupprimer);
    const confirmation = window.confirm(
      `Supprimer ${noms.length > 1 ? "les matières" : "la matière"} "${noms.join(
        '", "'
      )}" ? Elle${noms.length > 1 ? "s seront retirées" : " sera retirée"} de toutes les formations et de tous les comptes qui l'enseignent.`
    );
    if (!confirmation) return;

    setMessage(null);

    for (const nom of noms) {
      const { error } = await supabase.rpc("admin_supprimer_matiere", {
        nom_matiere: nom,
      });
      if (error) {
        setMessage({
          type: "erreur",
          texte: "Erreur lors de la suppression de la matière : " + error.message,
        });
      }
    }

    setMatieresASupprimer(new Set());
    setMatieresARenommer(new Set());
    setMessage((prev) => prev ?? { type: "succes", texte: "Matière(s) supprimée(s)." });
    loadMatieres();
    loadProfiles();
    if (formationChoisieId !== null) loadMatieresFormation(formationChoisieId);
  }

  async function retirerMatieresCocheesDeFormation() {
    if (formationChoisieId === null || matieresASupprimer.size === 0) return;
    await enregistrerMatieresFormation(
      matieresFormation.filter((m) => !matieresASupprimer.has(m))
    );
    setMatieresASupprimer(new Set());
    setMatieresARenommer(new Set());
  }

  const nbArchives = profiles.filter((p) => p.desactive_le).length;

  const profilesFiltres = profiles.filter((p) => {
    if (voirCorbeille) {
      if (!p.desactive_le) return false;
    } else if (p.desactive_le) {
      return false;
    }

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
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setVoirCorbeille((v) => !v)}
              >
                {voirCorbeille
                  ? "← Retour aux comptes"
                  : `Voir la corbeille${nbArchives > 0 ? ` (${nbArchives})` : ""}`}
              </Button>
              <LinkButton href="/dashboard/comptes/historique" variant="outline">
                Historique des changements
              </LinkButton>
            </div>
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
                className="text-sm text-gray-600 hover:text-gray-900 underline"
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

        <div className="mb-8 rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-green-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center text-lg font-semibold shrink-0">
              +
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Créer un compte</h2>
              <p className="text-sm text-gray-500">
                Un mot de passe temporaire est généré automatiquement ; la
                personne devra le changer à sa première connexion.
              </p>
            </div>
          </div>

          <div className="px-6 py-5">
            {createError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {createError}
              </div>
            )}

            <form onSubmit={createAccount}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="student">Étudiant</option>
                    <option value="instructor">Formateur</option>
                    <option value="admin">Administration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formation
                  </label>
                  <select
                    value={newFormationId}
                    onChange={(e) => setNewFormationId(e.target.value)}
                    disabled={newRole !== "student"}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Aucune pour l&apos;instant</option>
                    {formations.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={creating} className="px-6">
                  {creating ? "Création…" : "Créer le compte"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {voirCorbeille ? "Comptes archivés" : "Comptes existants"}
          </h2>

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
            <p className="text-sm text-gray-400">
              {voirCorbeille
                ? "Aucun compte archivé."
                : "Aucun compte ne correspond à ces critères."}
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
            <table className="text-sm table-fixed border-collapse">
              <colgroup>
                {largeursColonnes.map((largeur, i) => (
                  <col key={i} style={{ width: `${largeur}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-2 pr-3 truncate relative select-none">
                    Email
                    <span
                      onMouseDown={(e) => demarrerRedimensionnement(0, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300/60 active:bg-blue-400/80"
                    />
                  </th>
                  <th className="p-2 pr-3 truncate relative select-none">
                    Nom complet
                    <span
                      onMouseDown={(e) => demarrerRedimensionnement(1, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300/60 active:bg-blue-400/80"
                    />
                  </th>
                  <th className="p-2 pr-3 truncate relative select-none">
                    Formation
                    <span
                      onMouseDown={(e) => demarrerRedimensionnement(2, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300/60 active:bg-blue-400/80"
                    />
                  </th>
                  <th className="p-2 pr-3 truncate relative select-none">
                    Créé le
                    <span
                      onMouseDown={(e) => demarrerRedimensionnement(3, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300/60 active:bg-blue-400/80"
                    />
                  </th>
                  <th className="p-2 pr-3 truncate relative select-none">
                    Mot de passe
                    <span
                      onMouseDown={(e) => demarrerRedimensionnement(4, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300/60 active:bg-blue-400/80"
                    />
                  </th>
                  <th className="p-2 pl-3 pr-3 border-l border-gray-200 text-red-600 truncate relative select-none">
                    Rôle
                    <span
                      onMouseDown={(e) => demarrerRedimensionnement(5, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300/60 active:bg-blue-400/80"
                    />
                  </th>
                  <th className="p-2 pr-3 truncate relative select-none">
                    Actions
                    <span
                      onMouseDown={(e) => demarrerRedimensionnement(6, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-300/60 active:bg-blue-400/80"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {profilesFiltres.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 align-top">
                    <td className="p-2 truncate" title={p.email}>{p.email}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        defaultValue={p.nom_complet ?? ""}
                        placeholder="Nom Prénom"
                        onBlur={(e) => {
                          if (e.target.value !== (p.nom_complet ?? "")) {
                            enregistrerNomComplet(p.id, e.target.value);
                          }
                        }}
                        disabled={savingNomId === p.id || Boolean(p.desactive_le)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-full box-border disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </td>
                    <td className="p-2">
                      {p.role === "admin" ? (
                        <span className="text-sm text-gray-400 italic">
                          Non applicable
                        </span>
                      ) : p.role === "instructor" ? (
                        <MultiFormationSelect
                          formations={formations}
                          selectionIds={formationsFormateurs.get(p.id) ?? []}
                          onChange={(ids) => enregistrerFormationsFormateur(p.id, ids)}
                          disabled={
                            savingFormateurFormationsId === p.id ||
                            Boolean(p.desactive_le)
                          }
                          saving={savingFormateurFormationsId === p.id}
                        />
                      ) : (
                        <div className="flex flex-col gap-1 w-full">
                          <select
                            value={p.formation_id ?? ""}
                            onChange={(e) =>
                              enregistrerFormationEtudiant(
                                p.id,
                                Number(e.target.value)
                              )
                            }
                            disabled={
                              savingFormationId === p.id || Boolean(p.desactive_le)
                            }
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-full box-border disabled:bg-gray-50 disabled:text-gray-400"
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
                      )}
                    </td>
                    <td className="p-2 text-gray-500 truncate">
                      {new Date(p.created_at).toLocaleDateString("fr-CA")}
                    </td>
                    <td className="p-2 truncate">
                      <button
                        onClick={() => definirMotDePasse(p.id, p.email)}
                        disabled={settingPasswordId === p.id || Boolean(p.desactive_le)}
                        className="text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {settingPasswordId === p.id ? "Génération…" : "Regénérer"}
                      </button>
                    </td>
                    <td className="p-2 pl-3 border-l border-gray-200">
                      <select
                        value={p.role}
                        disabled={busyId === p.id || Boolean(p.desactive_le)}
                        onChange={(e) =>
                          changeRole(p.id, e.target.value as Role, p.email)
                        }
                        className="border border-gray-200 rounded-lg px-2 py-1 w-full box-border disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="student">Étudiant</option>
                        <option value="instructor">Formateur</option>
                        <option value="admin">Administration</option>
                      </select>
                    </td>
                    <td className="p-2 space-y-1">
                      {p.id === monId ? (
                        <span className="text-xs text-gray-400">
                          Ton propre compte
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          {p.desactive_le ? (
                            <button
                              onClick={() => restaurerCompte(p.id)}
                              disabled={busyArchiveId === p.id}
                              className="text-green-700 hover:underline disabled:opacity-50"
                            >
                              {busyArchiveId === p.id
                                ? "Restauration…"
                                : "Restaurer"}
                            </button>
                          ) : (
                            <button
                              onClick={() => archiverCompte(p.id, p.email)}
                              disabled={busyArchiveId === p.id}
                              className="text-amber-700 hover:underline disabled:opacity-50"
                            >
                              {busyArchiveId === p.id
                                ? "Archivage…"
                                : "Archiver"}
                            </button>
                          )}
                          <button
                            onClick={() =>
                              supprimerCompteDefinitivement(p.id, p.email)
                            }
                            disabled={busySuppressionId === p.id}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            {busySuppressionId === p.id
                              ? "Suppression…"
                              : "Supprimer"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Catalogue des formations
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Clique sur une formation pour filtrer le catalogue des matières
              à droite. Coche une ou plusieurs formations pour les renommer ou
              les supprimer.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                creerFormationCatalogue();
              }}
              className="flex items-center gap-2 mb-3"
            >
              <input
                type="text"
                value={nouvelleFormation}
                onChange={(e) => setNouvelleFormation(e.target.value)}
                placeholder="Nouvelle formation"
                disabled={ajoutFormationEnCours}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={ajoutFormationEnCours || !nouvelleFormation.trim()}
              >
                Ajouter
              </Button>
            </form>

            <div className="flex items-center justify-end gap-4 mb-2 text-sm">
              <button
                onClick={renommerFormationsCochees}
                disabled={formationsARenommer.size !== 1}
                className="w-20 text-center text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Renommer
              </button>
              <button
                onClick={supprimerFormationsCochees}
                disabled={formationsASupprimer.size === 0}
                className="w-20 text-center text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Supprimer{formationsASupprimer.size > 1 ? ` (${formationsASupprimer.size})` : ""}
              </button>
            </div>

            {formations.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune formation pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {formations.map((f) => (
                  <li
                    key={f.id}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                      formationChoisieId === f.id
                        ? "bg-blue-50 ring-1 ring-blue-200"
                        : ""
                    }`}
                  >
                    <button
                      onClick={() => setFormationChoisieId(f.id)}
                      disabled={busyFormationCatalogue === f.id}
                      className="flex-1 text-left text-sm text-gray-900"
                    >
                      {f.nom}
                    </button>
                    <div className="w-20 flex justify-center">
                      <input
                        type="checkbox"
                        checked={formationsARenommer.has(f.id)}
                        onChange={() =>
                          basculerCase(formationsARenommer, setFormationsARenommer, f.id)
                        }
                        className="shrink-0"
                      />
                    </div>
                    <div className="w-20 flex justify-center">
                      <input
                        type="checkbox"
                        checked={formationsASupprimer.has(f.id)}
                        onChange={() =>
                          basculerCase(formationsASupprimer, setFormationsASupprimer, f.id)
                        }
                        className="shrink-0"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Catalogue des matières
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              Coche une matière pour la renommer (partout où elle est
              utilisée) ou la retirer/supprimer.
            </p>

            {formationChoisieId !== null && (
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-gray-500">
                  Filtré sur :{" "}
                  <strong className="text-gray-700">
                    {formations.find((f) => f.id === formationChoisieId)?.nom}
                  </strong>
                </span>
                <button
                  onClick={() =>
                    setFiltrerMatieresParFormation((prev) => !prev)
                  }
                  className="text-blue-600 hover:underline"
                >
                  {filtrerMatieresParFormation
                    ? "Voir toutes les matières"
                    : "Filtrer par formation"}
                </button>
              </div>
            )}

            {formationChoisieId !== null && filtrerMatieresParFormation && (
              <div className="flex items-center gap-2 mb-3">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      assignerMatiereAFormation(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="" disabled>
                    Assigner une matière existante…
                  </option>
                  {toutesMatieres
                    .filter((m) => !matieresFormation.includes(m))
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
                {savingFormationMatieres && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    Enregistrement…
                  </span>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ajouterMatiereCatalogue();
              }}
              className="flex items-center gap-2 mb-4"
            >
              <input
                type="text"
                value={nouvelleMatiere}
                onChange={(e) => setNouvelleMatiere(e.target.value)}
                placeholder="Nouvelle matière"
                disabled={ajoutMatiereEnCours}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={ajoutMatiereEnCours || !nouvelleMatiere.trim()}
              >
                Ajouter
              </Button>
            </form>

            {(() => {
              const modeFormation =
                formationChoisieId !== null && filtrerMatieresParFormation;

              const matieresAffichees = modeFormation
                ? toutesMatieres.filter((m) => matieresFormation.includes(m))
                : toutesMatieres;

              return (
                <>
                  <div className="flex items-center justify-end gap-4 mb-2 text-sm">
                    <button
                      onClick={renommerMatieresCochees}
                      disabled={matieresARenommer.size !== 1}
                      className="w-20 text-center text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      Renommer
                    </button>
                    {modeFormation ? (
                      <button
                        onClick={retirerMatieresCocheesDeFormation}
                        disabled={matieresASupprimer.size === 0 || savingFormationMatieres}
                        className="w-20 text-center text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        Retirer{matieresASupprimer.size > 1 ? ` (${matieresASupprimer.size})` : ""}
                      </button>
                    ) : (
                      <button
                        onClick={supprimerMatieresCochees}
                        disabled={matieresASupprimer.size === 0}
                        className="w-20 text-center text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        Supprimer{matieresASupprimer.size > 1 ? ` (${matieresASupprimer.size})` : ""}
                      </button>
                    )}
                  </div>

                  {matieresAffichees.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      {modeFormation
                        ? "Aucune matière pour cette formation."
                        : "Aucune matière pour l'instant."}
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-72 overflow-y-auto">
                      {matieresAffichees.map((matiere) => (
                        <li key={matiere} className="flex items-center gap-3">
                          <span className="flex-1 text-sm text-gray-900 px-2 py-1.5">
                            {matiere}
                          </span>
                          <div className="w-20 flex justify-center">
                            <input
                              type="checkbox"
                              checked={matieresARenommer.has(matiere)}
                              onChange={() =>
                                basculerCase(matieresARenommer, setMatieresARenommer, matiere)
                              }
                              className="shrink-0"
                            />
                          </div>
                          <div className="w-20 flex justify-center">
                            <input
                              type="checkbox"
                              checked={matieresASupprimer.has(matiere)}
                              onChange={() =>
                                basculerCase(matieresASupprimer, setMatieresASupprimer, matiere)
                              }
                              className="shrink-0"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              );
            })()}
          </Card>

        </div>
      </div>
    </div>
  );
}
