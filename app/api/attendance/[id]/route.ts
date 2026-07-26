import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";

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

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      error,
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}