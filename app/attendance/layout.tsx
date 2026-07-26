import AuthGuard from "@/components/AuthGuard";

export default function AttendanceSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student", "instructor", "admin"]}>
      {children}
    </AuthGuard>
  );
}
