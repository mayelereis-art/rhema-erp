import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const DURACAO_SESSAO_MS = 5 * 24 * 60 * 60 * 1000; // 5 dias

export async function POST(req: Request) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ erro: "idToken ausente" }, { status: 400 });
  }

  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: DURACAO_SESSAO_MS });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("__session", sessionCookie, {
      maxAge: DURACAO_SESSAO_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ erro: "Token inválido" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("__session");
  return res;
}
