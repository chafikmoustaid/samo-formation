"use client";

import { supabase } from "@/lib/supabase";

export default function DeleteAttendanceButton({
  id,
}: {
  id: number;
}) {
  async function supprimer() {
    const confirmation = confirm(
      "Voulez-vous vraiment supprimer cette fiche ?"
    );

    if (!confirmation) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(
      `/api/attendance/${id}`,
      {
        method: "DELETE",
        headers: session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      }
    );

    if (!response.ok) {
      alert("Erreur de suppression");
      return;
    }

    window.location.reload();
  }

  return (
    <button
      onClick={supprimer}
      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
    >
      Supprimer
    </button>
  );
}