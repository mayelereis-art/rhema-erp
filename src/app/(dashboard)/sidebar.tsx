"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ papel, nome }: { papel: string; nome: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(auth);
    router.push("/login");
  }

  return (
    <aside
      className="no-print"
      style={{
        width: 230,
        flexShrink: 0,
        background: "var(--ink)",
        color: "#e9e4f0",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      <div style={{ padding: "26px 22px 20px" }}>
        <div style={{ fontFamily: "var(--font-d)", fontSize: 23, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1 }}>
          Rhema <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Decorações</em>
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: 2.5, textTransform: "uppercase", color: "#a99fc4", marginTop: 6 }}>
          Gestão de Locação
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 12px" }}>
        {NAV_ITEMS.filter((item) => !item.papeis || item.papeis.includes(papel as never)).map((item) => {
          const ativo = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                color: ativo ? "#fff" : "#c5bdd6",
                background: ativo ? "var(--rose)" : "transparent",
                fontSize: 13.5,
                fontWeight: 500,
                marginBottom: 2,
              }}
            >
              <span style={{ width: 18, textAlign: "center", fontSize: 15 }}>{item.icone}</span>
              {item.rotulo}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "16px 22px", fontSize: 11, color: "#8b82a6", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ marginBottom: 8 }}>{nome} · {papel}</div>
        <button onClick={handleSignOut} style={{ color: "#c5bdd6", fontSize: 11, fontWeight: 600 }}>
          Sair
        </button>
      </div>
    </aside>
  );
}
