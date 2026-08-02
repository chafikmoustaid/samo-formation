import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";

// Suppression "douce" : une fiche de présence peut avoir servi de base à la
// paie déjà versée, donc on ne détruit jamais la ligne — on la marque comme
// supprimée (corbeille) et elle reste restaurable. Voir PATCH ci-dessous
// pour la restauration, et /attendance/history?corbeille=1 pour la voir.
export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const supabase = supabaseFromRequest(request);
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendance")
    .update({
      supprime_le: new Date().toISOString(),
      supprime_par: user?.id ?? null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(error, { status: 500 });
  }

  return NextResponse.json({
    success: true,
  });
}

// Restauration depuis la corbeille.
export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const supabase = supabaseFromRequest(request);
  const { id } = await context.params;

  const { error } = await supabase
    .from("attendance")
    .update({ supprime_le: null, supprime_par: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json(error, { status: 500 });
  }

  return NextResponse.json({
    success: true,
  });
}