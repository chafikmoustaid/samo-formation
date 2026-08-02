import AuthGuard from "@/components/AuthGuard";

export default function AttendanceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // L'étudiant peut consulter le détail — mais seulement le sien : la
  // policy RLS "select = own row or staff" garantit qu'une requête sur
  // l'id d'une fiche appartenant à quelqu'un d'autre renvoie simplement
  // rien (la page affiche alors "Fiche introuvable"), et les actions de
  // validation/refus restent réservées au staff via `peutValider` dans
  // la page elle-même.
  return (
    <AuthGuard allowedRoles={["student", "instructor", "admin"]}>
      {children}
    </AuthGuard>
  );
}
