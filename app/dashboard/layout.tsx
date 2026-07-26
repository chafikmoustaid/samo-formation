import AuthGuard from "@/components/AuthGuard";

export default function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard allowedRoles={["admin"]}>{children}</AuthGuard>;
}
