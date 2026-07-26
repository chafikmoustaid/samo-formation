import AuthGuard from "@/components/AuthGuard";

export default function AttendanceHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["instructor", "admin"]}>{children}</AuthGuard>
  );
}
