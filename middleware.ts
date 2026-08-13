import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Domaines temporairement bloqués : le site déménage vers formationsamo.com
// mais celui-ci n'est pas encore branché. En attendant, on n'affiche plus le
// site sur le .ca public (formationsamo.ca / www.formationsamo.ca) — un
// message de courtoisie s'affiche à la place. Le sous-domaine
// direct.formationsamo.ca continue lui de servir le site normalement (accès
// direct conservé pour l'équipe).
const HOTES_BLOQUES = new Set(["formationsamo.ca", "www.formationsamo.ca"]);

const PAGE_COURTOISIE = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Formation SAMO</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%);
    color: #111827;
    padding: 24px;
  }
  .carte {
    max-width: 460px;
    text-align: center;
  }
  .logo {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #15803d;
    margin-bottom: 4px;
  }
  h1 {
    font-size: 22px;
    font-weight: 700;
    margin: 8px 0 12px;
    color: #111827;
  }
  p {
    font-size: 15px;
    line-height: 1.6;
    color: #4b5563;
    margin: 0;
  }
</style>
</head>
<body>
  <div class="carte">
    <div class="logo">FORMATION SAMO</div>
    <h1>Ce site n'est plus accessible à cette adresse</h1>
    <p>Merci de votre compréhension — nous mettons à jour notre présence en ligne.</p>
  </div>
</body>
</html>`;

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";

  if (HOTES_BLOQUES.has(host)) {
    return new NextResponse(PAGE_COURTOISIE, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico).*)",
  ],
};
