"use client";

import { useMemo, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase-client";
import { atualizarProduto, criarProduto, excluirProduto, type DadosProduto } from "@/lib/produtos";
import { calcularLocacoesParaRecuperar, calcularPrecoSugerido, PERCENTUAL_RECUPERACAO_PADRAO } from "@/lib/precificacao";
import type { Categoria, Fornecedor, Produto } from "@/lib/firestore-schema";

const VAZIO: DadosProduto = {
  nome: "",
  emoji: "📦",
  fotoUrl: "",
  precoDiaria: 0,
  quantidade: 1,
  destaque: false,
  categoriaId: "",
  fornecedorId: "",
  custoAquisicao: 0,
  percentualRecuperacao: PERCENTUAL_RECUPERACAO_PADRAO,
};

export function CatalogoClient({
  produtos,
  categorias,
  fornecedores,
}: {
  produtos: Produto[];
  categorias: Categoria[];
  fornecedores: Fornecedor[];
}) {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [editando, setEditando] = useState<Produto | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const filtrados = useMemo(() => {
    return produtos.filter((p) => {
      const bateBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
      const bateCategoria = !categoriaFiltro || p.categoriaId === categoriaFiltro;
      return bateBusca && bateCategoria;
    });
  }, [produtos, busca, categoriaFiltro]);

  function nomeCategoria(id?: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "";
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este produto? Contratos existentes não são alterados.")) return;
    await excluirProduto(id);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", minWidth: 220 }}
        />
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)" }}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <button
          className="btn btn-p"
          style={{ marginLeft: "auto" }}
          onClick={() => {
            setEditando(null);
            setMostrarForm(true);
          }}
        >
          + Novo produto
        </button>
      </div>

      {mostrarForm && (
        <ProdutoForm
          inicial={editando}
          categorias={categorias}
          fornecedores={fornecedores}
          onFechar={() => setMostrarForm(false)}
          onEditar={(p) => {
            setEditando(p);
            setMostrarForm(true);
          }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
        {filtrados.map((p) => (
          <div
            key={p.id}
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r)",
              overflow: "hidden",
              boxShadow: "var(--shadow)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 42,
                background: p.fotoUrl ? "var(--cream)" : "linear-gradient(135deg,#f7ede2,#f3e3ea)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {p.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                p.emoji
              )}
              {p.destaque && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "rgba(42,36,56,.85)",
                    color: "#fff",
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 20,
                  }}
                >
                  Destaque
                </span>
              )}
            </div>
            <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nome}</div>
              <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", marginTop: 3 }}>
                {nomeCategoria(p.categoriaId)}
              </div>
              <div style={{ fontFamily: "var(--font-d)", fontSize: 18, marginTop: 8 }}>
                R$ {p.precoDiaria.toFixed(2)} <small style={{ fontSize: 11, color: "var(--ink-soft)" }}>/diária</small>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>Estoque: {p.quantidade}</div>
              {!!p.custoAquisicao && (() => {
                const sugerido = calcularPrecoSugerido(p.custoAquisicao, p.percentualRecuperacao ?? PERCENTUAL_RECUPERACAO_PADRAO);
                const locacoes = calcularLocacoesParaRecuperar(p.custoAquisicao, p.precoDiaria);
                const abaixo = p.precoDiaria < sugerido;
                return (
                  <div style={{ fontSize: 11.5, marginTop: 4, color: abaixo ? "var(--rose-deep)" : "var(--sage)" }}>
                    {abaixo
                      ? `⚠ sugerido R$ ${sugerido.toFixed(2)} (custou R$ ${p.custoAquisicao.toFixed(2)})`
                      : `recupera em ${locacoes} locação(ões)`}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-g btn-sm"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setEditando(p);
                    setMostrarForm(true);
                  }}
                >
                  Editar
                </button>
                <button
                  className="btn btn-x"
                  style={{ color: "var(--rose-deep)" }}
                  onClick={() => handleExcluir(p.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div style={{ color: "var(--ink-soft)", padding: 20 }}>Nenhum produto encontrado.</div>
        )}
      </div>
    </div>
  );
}

function ProdutoForm({
  inicial,
  categorias,
  fornecedores,
  onFechar,
  onEditar,
}: {
  inicial: Produto | null;
  categorias: Categoria[];
  fornecedores: Fornecedor[];
  onFechar: () => void;
  onEditar: (p: Produto) => void;
}) {
  const [dados, setDados] = useState<DadosProduto>(
    inicial
      ? {
          nome: inicial.nome,
          emoji: inicial.emoji,
          fotoUrl: inicial.fotoUrl ?? "",
          precoDiaria: inicial.precoDiaria,
          quantidade: inicial.quantidade,
          destaque: inicial.destaque,
          categoriaId: inicial.categoriaId ?? "",
          fornecedorId: inicial.fornecedorId ?? "",
          custoAquisicao: inicial.custoAquisicao ?? 0,
          percentualRecuperacao: inicial.percentualRecuperacao ?? PERCENTUAL_RECUPERACAO_PADRAO,
        }
      : VAZIO
  );
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const precoSugerido = calcularPrecoSugerido(dados.custoAquisicao ?? 0, dados.percentualRecuperacao ?? PERCENTUAL_RECUPERACAO_PADRAO);

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      const caminho = `produtos/${Date.now()}-${arquivo.name}`;
      const storageRef = ref(storage, caminho);
      await uploadBytes(storageRef, arquivo);
      const url = await getDownloadURL(storageRef);
      setDados((prev) => ({ ...prev, fotoUrl: url }));
    } catch {
      alert("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const payload: DadosProduto = {
      ...dados,
      categoriaId: dados.categoriaId || undefined,
      fornecedorId: dados.fornecedorId || undefined,
      fotoUrl: dados.fotoUrl || undefined,
    };
    if (inicial) {
      await atualizarProduto(inicial.id, payload);
    } else {
      await criarProduto(payload);
    }
    setSalvando(false);
    onFechar();
  }

  void onEditar; // reservado para reabrir edição após salvar, se necessário

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
      <div style={{ gridColumn: "1 / -1", fontFamily: "var(--font-d)", fontSize: 17 }}>
        {inicial ? "Editar produto" : "Novo produto"}
      </div>

      <Campo label="Nome">
        <input required value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="Emoji (se não tiver foto)">
        <input value={dados.emoji} onChange={(e) => setDados({ ...dados, emoji: e.target.value })} style={campoStyle} />
      </Campo>
      <Campo label="Foto do produto">
        <input type="file" accept="image/*" onChange={handleFoto} style={{ ...campoStyle, padding: "5px 8px" }} />
        {enviandoFoto && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>Enviando...</div>}
        {dados.fotoUrl && !enviandoFoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dados.fotoUrl} alt="Pré-visualização" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, marginTop: 6 }} />
        )}
      </Campo>
      <Campo label="Custo de aquisição (R$)">
        <input
          type="number"
          step="0.01"
          value={dados.custoAquisicao}
          onChange={(e) => setDados({ ...dados, custoAquisicao: Number(e.target.value) })}
          style={campoStyle}
          placeholder="quanto custou comprar"
        />
      </Campo>
      <Campo label="% recuperado por locação">
        <input
          type="number"
          step="1"
          value={dados.percentualRecuperacao}
          onChange={(e) => setDados({ ...dados, percentualRecuperacao: Number(e.target.value) })}
          style={campoStyle}
        />
      </Campo>
      <Campo label="Preço diária (R$)">
        <input
          type="number"
          step="0.01"
          required
          value={dados.precoDiaria}
          onChange={(e) => setDados({ ...dados, precoDiaria: Number(e.target.value) })}
          style={campoStyle}
        />
        {!!dados.custoAquisicao && (
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
            sugerido: R$ {precoSugerido.toFixed(2)}
            <button
              type="button"
              className="btn btn-x"
              style={{ padding: "2px 8px", fontSize: 11 }}
              onClick={() => setDados({ ...dados, precoDiaria: precoSugerido })}
            >
              usar
            </button>
          </div>
        )}
      </Campo>
      <Campo label="Estoque">
        <input
          type="number"
          required
          value={dados.quantidade}
          onChange={(e) => setDados({ ...dados, quantidade: Number(e.target.value) })}
          style={campoStyle}
        />
      </Campo>
      <Campo label="Categoria">
        <select value={dados.categoriaId} onChange={(e) => setDados({ ...dados, categoriaId: e.target.value })} style={campoStyle}>
          <option value="">—</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Fornecedor">
        <select value={dados.fornecedorId} onChange={(e) => setDados({ ...dados, fornecedorId: e.target.value })} style={campoStyle}>
          <option value="">—</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </Campo>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={dados.destaque} onChange={(e) => setDados({ ...dados, destaque: e.target.checked })} />
        Destaque na loja
      </label>

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

const campoStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--line)",
};
