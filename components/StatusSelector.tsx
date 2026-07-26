"use client";

import { supabase } from "@/lib/supabase";

export default function StatusSelector({
  id,
  statut,
}: {
  id: number;
  statut: string;
}) {
  async function changerStatut(
    nouveauStatut: string
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch(
      `/api/attendance/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          statut: nouveauStatut,
        }),
      }
    );

    window.location.reload();
  }

  return (
    <select
      value={statut}
      onChange={(e) =>
        changerStatut(e.target.value)
      }
      className="border rounded px-2 py-1"
    >
      <option value="en_attente">
        en_attente
      </option>

      <option value="validee">
        validee
      </option>

      <option value="refusee">
        refusee
      </option>

    </select>
  );
}