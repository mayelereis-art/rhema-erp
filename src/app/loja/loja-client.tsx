"use client";

import { useMemo, useState } from "react";
import type { Categoria, Produto } from "@/lib/firestore-schema";
import { solicitarOrcamentoPublico } from "@/lib/loja";

const NUMERO_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? "";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

interface SelecaoItem {
  produtoId: string;
  quantidade: number;
}

export function LojaClient({ produtos, categorias }: { produtos: Produto[]; categorias: Categoria[] }) {
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [selecao, setSelecao] = useState<SelecaoItem[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);

  const destaques = useMemo(() => produtos.filter((p) => p.destaque), [produtos]);
  const filtrados = useMemo(
    () => produtos.filter((p) => !categoriaFiltro || p.categoriaId === categoriaFiltro),
    [produtos, categoriaFiltro]
  );

  function nomeCategoria(id?: string) {
    return categorias.find((c) => c.id === id)?.nome ?? "";
  }

  function linkWhatsApp(produto: Produto) {
    const texto = encodeURIComponent(`Olá! Quero saber mais sobre o item "${produto.nome}" da Rhema Decorações.`);
    return NUMERO_WHATSAPP ? `https://wa.me/${NUMERO_WHATSAPP}?text=${texto}` : `https://wa.me/?text=${texto}`;
  }

  function adicionarSelecao(produtoId: string) {
    setSelecao((prev) => {
      const existente = prev.find((i) => i.produtoId === produtoId);
      if (existente) return prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [...prev, { produtoId, quantidade: 1 }];
    });
  }

  function removerSelecao(produtoId: string) {
    setSelecao((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <header style={{ padding: "26px 34px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <div style={{ fontFamily: "var(--font-d)", fontSize: 26, fontWeight: 600 }}>
          Rhema <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Decorações</em>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
          Decoração de eventos para locação em Guararema. Escolha os itens e peça seu orçamento.
        </div>
      </header>

      <div style={{ padding: "28px 34px 100px", maxWidth: 1100, margin: "0 auto" }}>
        {destaques.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: 20, marginBottom: 14 }}>Destaques</h2>
            <Grade
              produtos={destaques}
              nomeCategoria={nomeCategoria}
              linkWhatsApp={linkWhatsApp}
              onAdicionar={adicionarSelecao}
            />
          </section>
        )}

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: 20 }}>Catálogo completo</h2>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)" }}
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <Grade
            produtos={filtrados}
            nomeCategoria={nomeCategoria}
            linkWhatsApp={linkWhatsApp}
            onAdicionar={adicionarSelecao}
          />
        </section>
      </div>

      {selecao.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--ink)",
            color: "#fff",
            padding: "14px 34px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>{selecao.reduce((s, i) => s + i.quantidade, 0)} item(ns) selecionado(s) para orçamento</span>
          <button className="btn btn-p" onClick={() => setMostrarForm(true)}>
            Pedir orçamento
          </button>
        </div>
      )}

      {mostrarForm && (
        <FormularioOrcamento
          selecao={selecao}
          produtos={produtos}
          onRemover={removerSelecao}
          onFechar={() => setMostrarForm(false)}
          onConcluido={() => {
            setSelecao([]);
            setMostrarForm(false);
          }}
        />
      )}
    </div>
  );
}

function Grade({
  produtos,
  nomeCategoria,
  linkWhatsApp,
  onAdicionar,
}: {
  produtos: Produto[];
  nomeCategoria: (id?: string) => string;
  linkWhatsApp: (p: Produto) => string;
  onAdicionar: (produtoId: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
      {produtos.map((p) => (
        <div key={p.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", overflow: "hidden", boxShadow: "var(--shadow)", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              background: p.fotoUrl ? "var(--cream)" : "linear-gradient(135deg,#f7ede2,#f3e3ea)",
              overflow: "hidden",
            }}
          >
            {p.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.fotoUrl} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              p.emoji
            )}
          </div>
          <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nome}</div>
            <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", marginTop: 3 }}>{nomeCategoria(p.categoriaId)}</div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 18, marginTop: 8 }}>
              R$ {p.precoDiaria.toFixed(2)} <small style={{ fontSize: 11, color: "var(--ink-soft)" }}>/diária</small>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-p btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => onAdicionar(p.id)}>
                + Orçamento
              </button>
              <a href={linkWhatsApp(p)} target="_blank" rel="noreferrer" className="btn btn-g btn-sm">
                Quero este
              </a>
            </div>
          </div>
        </div>
      ))}
      {produtos.length === 0 && <div style={{ color: "var(--ink-soft)" }}>Nenhum produto encontrado.</div>}
    </div>
  );
}

function FormularioOrcamento({
  selecao,
  produtos,
  onRemover,
  onFechar,
  onConcluido,
}: {
  selecao: SelecaoItem[];
  produtos: Produto[];
  onRemover: (produtoId: string) => void;
  onFechar: () => void;
  onConcluido: () => void;
}) {
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [evento, setEvento] = useState("");
  const [inicio, setInicio] = useState(hoje());
  const [fim, setFim] = useState(hoje());
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);

  function nomeProduto(id: string) {
    return produtos.find((p) => p.id === id)?.nome ?? "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const resp = await solicitarOrcamentoPublico({
      nomeCliente,
      telefone,
      evento,
      inicio,
      fim,
      itens: selecao,
    });
    setEnviando(false);

    if (resp.ok) {
      setResultado({ ok: true, mensagem: `Pedido enviado! Seu orçamento é o nº ${resp.numero}. Entraremos em contato.` });
      setTimeout(onConcluido, 2500);
    } else {
      setResultado({ ok: false, mensagem: resp.erro });
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,36,56,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 50,
      }}
    >
      <div style={{ background: "var(--paper)", borderRadius: "var(--r)", padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "var(--font-d)", fontSize: 20, marginBottom: 16 }}>Solicitar orçamento</div>

        <div style={{ marginBottom: 16 }}>
          {selecao.map((i) => (
            <div key={i.produtoId} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span>
                {nomeProduto(i.produtoId)} × {i.quantidade}
              </span>
              <button type="button" className="btn btn-x" onClick={() => onRemover(i.produtoId)}>
                ×
              </button>
            </div>
          ))}
        </div>

        {resultado ? (
          <div style={{ color: resultado.ok ? "var(--sage)" : "var(--rose-deep)", fontSize: 14, marginBottom: 16 }}>{resultado.mensagem}</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input required placeholder="Seu nome" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} style={campoStyle} />
            <input required placeholder="WhatsApp (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={campoStyle} />
            <input placeholder="Nome do evento" value={evento} onChange={(e) => setEvento(e.target.value)} style={campoStyle} />
            <div style={{ display: "flex", gap: 10 }}>
              <input type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} style={{ ...campoStyle, flex: 1 }} />
              <input type="date" required value={fim} onChange={(e) => setFim(e.target.value)} style={{ ...campoStyle, flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="submit" disabled={enviando} className="btn btn-p" style={{ flex: 1, justifyContent: "center" }}>
                {enviando ? "Enviando..." : "Enviar pedido"}
              </button>
              <button type="button" className="btn btn-g" onClick={onFechar}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const campoStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line)" };
