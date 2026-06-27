import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao-servidor";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();

  if (!sessao) {
    redirect("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar papel={sessao.papel} nome={sessao.nome} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{children}</main>
    </div>
  );
}
