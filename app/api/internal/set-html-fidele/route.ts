import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const JETON_TEMPORAIRE = "samo-migration-2026-08-03-x7q2";

export async function POST(request: Request) {
  const jeton = request.headers.get("x-migration-token");
  if (jeton !== JETON_TEMPORAIRE) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = Number(url.searchParams.get("session_id"));
  if (!sessionId || sessionId < 31 || sessionId > 35) {
    return NextResponse.json(
      { error: "session_id invalide (attendu 31-35)." },
      { status: 400 }
    );
  }

  const html = await request.text();
  if (!html || html.length < 100) {
    return NextResponse.json(
      { error: "Contenu HTML vide ou trop court." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin()
    .from("course_lessons")
    .update({ html_fidele: html })
    .eq("session_id", sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    session_id: sessionId,
    taille: html.length,
  });
}
