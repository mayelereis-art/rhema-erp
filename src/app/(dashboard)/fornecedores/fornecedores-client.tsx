"use client";

import { useState } from "react";
import { atualizarFornecedor, criarFornecedor, excluirFornecedor, type DadosFornecedor } from "@/lib/fornecedores";
import type { Fornecedor, Produto } from "@/lib/firestore-schema";

const VAZIO: DadosFornecedor = { nome: "", telefone: "", email: "", fornece: "" };

export function FornecedoresClient({ fornecedores, produtos }: { fornecedores: Fornecedor[]; produtos: Produto[] }) {
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  function produtosDoFornecedor(id: string) {
    return produtos.filter((p) => p.fornecedorId === id);
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este fornecedor? Produtos vinculados ficam sem fornecedor.")) return;
    await excluirFornecedor(id);
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
          + Novo fornecedor
        </button>
      </div>

      {mostrarForm && <FornecedorForm inicial={editando} onFechar={() => setMostrarForm(false)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {fornecedores.map((f) => {
          const itens = produtosDoFornecedor(f.id);
          return (
            <div key={f.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{f.nome}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    {f.telefone} {f.fornece && `· ${f.fornece}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-g btn-sm"
                    onClick={() => {
                      setEditando(f);
                      setMostrarForm(true);
                    }}
                  >
                    Editar
                  </button>
                  <button className="btn btn-x" style={{ color: "var(--rose-deep)" }} onClick={() => handleExcluir(f.id)}>
                    Excluir
                  </button>
                </div>
              </div>
              {itens.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {itens.map((p) => (
                    <span
                      key={p.id}
                      style={{ fontSize: 12, background: "var(--cream)", borderRadius: 20, padding: "4px 10px" }}
                    >
                      {p.emoji} {p.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {fornecedores.length === 0 && <div style={{ color: "var(--ink-soft)" }}>Nenhum fornecedor cadastrado.</div>}
      </div>
    </div>
  );
}

function FornecedorForm({ inicial, onFechar }: { inicial: Fornecedor | null; onFechar: () => void }) {
  const [dados, setDados] = useState<DadosFornecedor>(
    inicial ? { nome: inicial.nome, telefone: inicial.telefone ?? "", email: inicial.email ?? "", fornece: inicial.fornece ?? "" } : VAZIO
  );
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    if (inicial) {
      await atualizarFornecedor(inicial.id, dados);
    } else {
      await criarFornecedor(dados);
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
      <div style={{ gridColumn: "1 / -1", fontFamily: "var(--font-d)", fontSize: 17 }}>{inicial ? "Editar fornecedor" : "Novo fornecedor"}</div>
      <Campo label="Nome">
        <input required value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="Telefone">
        <input value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="E-mail">
        <input type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="O que fornece">
        <input value={dados.fornece} onChange={(e) => setDados({ ...dados, fornece: e.target.value })} style={campoStyle} />
      </Campo>
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
