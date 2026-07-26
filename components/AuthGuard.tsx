"use client";

import { useAuthGuard, type Role } from "@/lib/useAuthGuard";

export default function AuthGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
}) {
  const { status } = useAuthGuard(allowedRoles);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-green-600 animate-spin" />
          Chargement...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
