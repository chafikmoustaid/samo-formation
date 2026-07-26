import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";

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

  const body = await request.json();

  const { error } = await supabase
    .from("attendance")
    .update({
      statut: body.statut,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      error,
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
  });
}