"use client";

import { useState } from "react";
import Link from "next/link";
import { atualizarCliente, criarCliente, excluirCliente, type DadosCliente } from "@/lib/clientes";
import type { Cliente } from "@/lib/firestore-schema";

const VAZIO: DadosCliente = { nome: "", telefone: "", email: "", documento: "", rg: "", endereco: "" };

export function ClientesClient({ clientes }: { clientes: Cliente[] }) {
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    await excluirCliente(id);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <button
          className="btn btn-p"
          onClick={() => {
            setEditando(null);
            setMostrarForm(true);
          }}
        >
          + Novo cliente
        </button>
      </div>

      {mostrarForm && (
        <ClienteForm inicial={editando} onFechar={() => setMostrarForm(false)} />
      )}

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--cream)", textAlign: "left" }}>
              <th style={th}>Nome</th>
              <th style={th}>Telefone</th>
              <th style={th}>Documento</th>
              <th style={{ ...th, textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={td}>
                  <Link href={`/clientes/${c.id}`}>{c.nome}</Link>
                </td>
                <td style={td}>{c.telefone ?? "—"}</td>
                <td style={td}>{c.documento ?? "—"}</td>
                <td style={{ ...td, textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-g btn-sm"
                    onClick={() => {
                      setEditando(c);
                      setMostrarForm(true);
                    }}
                  >
                    Editar
                  </button>
                  <button className="btn btn-x" style={{ color: "var(--rose-deep)" }} onClick={() => handleExcluir(c.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td style={td} colSpan={4}>
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClienteForm({ inicial, onFechar }: { inicial: Cliente | null; onFechar: () => void }) {
  const [dados, setDados] = useState<DadosCliente>(
    inicial
      ? {
          nome: inicial.nome,
          telefone: inicial.telefone ?? "",
          email: inicial.email ?? "",
          documento: inicial.documento ?? "",
          rg: inicial.rg ?? "",
          endereco: inicial.endereco ?? "",
        }
      : VAZIO
  );
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    if (inicial) {
      await atualizarCliente(inicial.id, dados);
    } else {
      await criarCliente(dados);
    }
    setSalvando(false);
    onFechar();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r)",
        padding: 20,
        marginBottom: 20,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 14,
        alignItems: "end",
      }}
    >
      <div style={{ gridColumn: "1 / -1", fontFamily: "var(--font-d)", fontSize: 17 }}>{inicial ? "Editar cliente" : "Novo cliente"}</div>
      <Campo label="Nome">
        <input required value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="Telefone">
        <input value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="E-mail">
        <input type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="CPF/CNPJ">
        <input value={dados.documento} onChange={(e) => setDados({ ...dados, documento: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="RG">
        <input value={dados.rg} onChange={(e) => setDados({ ...dados, rg: e.target.value })} style={campoStyle} />
      </Campo>
      <div style={{ gridColumn: "1 / -1" }}>
        <Campo label="Endereço">
          <input value={dados.endereco} onChange={(e) => setDados({ ...dados, endereco: e.target.value })} style={campoStyle} />
        </Campo>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={salvando} className="btn btn-p">
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="btn btn-g" onClick={onFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const campoStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" };
const th: React.CSSProperties = { padding: "10px 16px", fontSize: 11.5, textTransform: "uppercase", color: "var(--ink-soft)" };
const td: React.CSSProperties = { padding: "10px 16px" };
