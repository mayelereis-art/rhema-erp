import { NextResponse, type NextRequest } from "next/server";

// O middleware roda no Edge runtime, que não suporta o Admin SDK do Firebase.
// Por isso ele só checa a presença do cookie de sessão; a verificação criptográfica
// completa (validade, papel do usuário) acontece no layout do dashboard, que roda
// em Node.js (ver src/app/(dashboard)/layout.tsx).
export function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get("__session");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protege todas as rotas internas, exceto login, loja pública, api de auth e assets.
  matcher: ["/((?!login|loja|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
