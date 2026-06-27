"use client";

import { Suspense, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase-client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const credencial = await signInWithEmailAndPassword(auth, email, senha);
      const idToken = await credencial.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        setErro("Não foi possível iniciar a sessão.");
        setCarregando(false);
        return;
      }

      router.push(searchParams.get("callbackUrl") ?? "/painel");
    } catch {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--cream)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r)",
          boxShadow: "var(--shadow-lg)",
          padding: "36px 32px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--rose)",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-d)",
              fontSize: 26,
              color: "#fff",
              fontWeight: 600,
            }}
          >
            R
          </div>
          <div style={{ fontFamily: "var(--font-d)", fontSize: 23, fontWeight: 600, letterSpacing: -0.5 }}>
            Rhema <em style={{ color: "var(--gold)" }}>Decorações</em>
          </div>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: "var(--ink-soft)",
              marginTop: 6,
            }}
          >
            Gestão de Locação
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}
            />
          </div>

          {erro && (
            <div style={{ color: "var(--rose-deep)", fontSize: 13, marginBottom: 16 }}>{erro}</div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="btn btn-p"
            style={{ width: "100%", justifyContent: "center", padding: "11px 16px", fontSize: 14 }}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
