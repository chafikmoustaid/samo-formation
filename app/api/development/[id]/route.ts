import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";

// Suppression "douce" : une fiche de développement peut déjà avoir servi à
// la paie, donc on ne la détruit jamais — on la marque comme supprimée
// (corbeille) et elle reste restaurable. Voir PATCH ci-dessous pour la
// restauration, et /development/history (bouton "Voir la corbeille").
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseFromRequest(request);
  const { id } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("development_sheets")
    .update({
      supprime_le: new Date().toISOString(),
      supprime_par: user?.id ?? null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(error, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Restauration depuis la corbeille.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseFromRequest(request);
  const { id } = await context.params;

  const { error } = await supabase
    .from("development_sheets")
    .update({ supprime_le: null, supprime_par: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json(error, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
