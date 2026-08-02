import AuthGuard from "@/components/AuthGuard";

// La RLS restreint déjà un formateur à ses propres fiches (voir policy
// development_select) : ouvrir cette page aux deux rôles est donc sûr, un
// formateur ne pourra jamais charger la fiche d'un autre.
export default function DevelopmentDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["instructor", "admin"]}>{children}</AuthGuard>
  );
}
