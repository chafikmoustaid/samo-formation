import AuthGuard from "@/components/AuthGuard";

export default function StudentSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard allowedRoles={["student", "admin"]}>{children}</AuthGuard>;
}
