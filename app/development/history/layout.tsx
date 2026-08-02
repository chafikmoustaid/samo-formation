import AuthGuard from "@/components/AuthGuard";

export default function DevelopmentHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["instructor", "admin"]}>{children}</AuthGuard>
  );
}
