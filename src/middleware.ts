import { NextResponse, type NextRequest } from "next/server";

// O middleware roda no Edge runtime, que não suporta o Admin SDK do Firebase.
// Por isso ele só checa a presença do cookie de sessão; a verificação criptográfica
// completa (validade, papel do usuário) acontece no layout do dashboard, que roda
// em Node.js (ver src/app/(dashboard)/layout.tsx).
// O matcher do Next.js usa um compilador de rotas limitado (path-to-regexp),
// que não interpreta corretamente um lookahead com `$` no fim — por isso a
// exclusão de arquivos estáticos da pasta public (ex.: logo-rhema.png) é
// verificada aqui dentro, com regex JS de verdade, em vez de no matcher.
const ARQUIVO_ESTATICO = /\.[a-zA-Z0-9]+$/;

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-debug-pathname", req.nextUrl.pathname);
  res.headers.set("x-debug-estatico", String(ARQUIVO_ESTATICO.test(req.nextUrl.pathname)));

  if (ARQUIVO_ESTATICO.test(req.nextUrl.pathname)) {
    return res;
  }

  const sessionCookie = req.cookies.get("__session");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  // Protege todas as rotas internas, exceto login, loja pública, api de auth
  // e assets internos do Next. Arquivos estáticos da pasta public passam pelo
  // matcher mas são liberados na função acima.
  matcher: ["/((?!login|loja|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
