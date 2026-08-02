import AuthGuard from "@/components/AuthGuard";

export default function DevelopmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["instructor", "admin"]}>{children}</AuthGuard>
  );
}
