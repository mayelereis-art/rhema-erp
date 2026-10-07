"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarOrcamentoInteligente } from "@/lib/orcamento-inteligente-gerar";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase-client";
import { comprimirImagem } from "@/lib/imagem-cliente";
import { criarCliente } from "@/lib/clientes";
import { consultarDisponibilidade } from "@/lib/disponibilidade-dados";
import { analisarDecoracao, type AnaliseDecoracao, type ComponenteIA, type ResultadoAnalise } from "@/lib/orcamento-ia";
import { ehSabado, statusComponente, sugerirProdutos, type ProdutoCatalogo, type StatusComponente } from "@/lib/cruzamento-catalogo";
import type { Cliente, TipoServico } from "@/lib/firestore-schema";
import { calcularOrcamento, precoVendaSugerido, type RegrasPrecificacao } from "@/lib/motor-custos";

/** Componente da análise + custo interno e preço de venda (usados quando não é item do catálogo). */
export type Linha = ComponenteIA & { custoUnitario: number; precoUnitario: number; precoManual: boolean };
const SEM_PRECO = { custoUnitario: 0, precoUnitario: 0, precoManual: false };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTOS = 8;

interface Foto {
  id: string;
  previewUrl: string;
  caminho?: string; // preenchido quando o upload termina
  status: "enviando" | "ok" | "erro";
}

export function OrcamentoInteligente({
  clientes: clientesIniciais,
  catalogo,
  regras,
  iaConfigurada,
}: {
  clientes: Cliente[];
  catalogo: ProdutoCatalogo[];
  regras: RegrasPrecificacao;
  iaConfigurada: boolean;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [descricao, setDescricao] = useState("");
  const [clientes, setClientes] = useState(clientesIniciais);
  const [clienteId, setClienteId] = useState("");
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [cidade, setCidade] = useState("Guararema");
  const [convidados, setConvidados] = useState("");
  const [tema, setTema] = useState("");
  const [tipoServico, setTipoServico] = useState<TipoServico>("PRESENCIAL");
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [analisando, iniciar] = useTransition();
  // Cópia editável dos componentes — a análise original da IA fica intacta em `resultado`.
  const [componentes, setComponentes] = useState<Linha[] | null>(null);
  const [livre, setLivre] = useState<Record<string, number> | null>(null);
  const [horas, setHoras] = useState({ producao: 0, montagem: 0, desmontagem: 0 });
  const [km, setKm] = useState(0);
  const [gerando, iniciarGerar] = useTransition();
  const [erroGerar, setErroGerar] = useState<string | null>(null);
  const router = useRouter();
  const [erroEstoque, setErroEstoque] = useState(false);

  useEffect(() => {
    if (!componentes || !dataEvento) return;
    let cancelado = false;
    setLivre(null);
    setErroEstoque(false);
    const data = new Date(dataEvento).toISOString();
    consultarDisponibilidade(data, data)
      .then((linhas) => {
        if (!cancelado) setLivre(Object.fromEntries(linhas.map((l) => [l.produtoId, l.livre])));
      })
      .catch(() => !cancelado && setErroEstoque(true));
    return () => {
      cancelado = true;
    };
    // só recarrega quando muda a data ou quando a lista passa a existir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataEvento, componentes === null]);

  const enviando = fotos.some((f) => f.status === "enviando");
  const fotosProntas = fotos.filter((f) => f.status === "ok" && f.caminho);

  async function handleArquivos(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    const validos = arquivos.filter((a) => TIPOS_ACEITOS.includes(a.type));
    if (validos.length < arquivos.length) alert("Alguns arquivos foram ignorados — use apenas JPG, PNG ou WEBP.");

    const vagas = MAX_FOTOS - fotos.length;
    if (validos.length > vagas) alert(`Máximo de ${MAX_FOTOS} fotos por orçamento.`);

    for (const arquivo of validos.slice(0, Math.max(0, vagas))) {
      const id = crypto.randomUUID();
      setFotos((prev) => [...prev, { id, previewUrl: URL.createObjectURL(arquivo), status: "enviando" }]);
      try {
        const imagem = await comprimirImagem(arquivo, 1600, 0.85);
        const caminho = `orcamentos-ia/${Date.now()}-${id}.jpg`;
        await uploadBytes(ref(storage, caminho), imagem, { contentType: "image/jpeg" });
        setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, caminho, status: "ok" } : f)));
      } catch {
        setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, status: "erro" } : f)));
      }
    }
  }

  async function removerFoto(foto: Foto) {
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    URL.revokeObjectURL(foto.previewUrl);
    if (foto.caminho) {
      deleteObject(ref(storage, foto.caminho)).catch(() => {
        // arquivo órfão no Storage não afeta nada — só ocupa espaço
      });
    }
  }

  async function handleCriarCliente() {
    if (!novoClienteNome.trim()) return;
    const id = await criarCliente({ nome: novoClienteNome.trim() });
    setClientes((prev) => [...prev, { id, nome: novoClienteNome.trim(), criadoEm: undefined as never }]);
    setClienteId(id);
    setNovoClienteNome("");
  }

  function handleAnalisar() {
    setResultado(null);
    iniciar(async () => {
      const r = await analisarDecoracao({
        fotos: fotosProntas.map((f) => f.caminho!),
        descricao,
        clienteId,
        dataEvento,
        horario,
        local,
        cidade,
        convidados: convidados ? Number(convidados) : undefined,
        tema,
        tipoServico,
      });
      setResultado(r);
      if (r.ok) {
        setComponentes(r.analise.componentes.map((c) => ({ ...c, materiais: [...c.materiais], ...SEM_PRECO })));
        setHoras(r.analise.horasEstimadas);
      }
    });
  }

  const pendenciasGerar = [
    !clienteId && "selecione o cliente",
    !dataEvento && "informe a data do evento",
    componentes?.length === 0 && "adicione itens",
    componentes?.some((c) => !c.descricao.trim()) && "há item sem descrição",
    componentes?.some((c) => !c.produtoId && c.precoUnitario <= 0) && "há item avulso sem preço de venda",
  ].filter((p): p is string => Boolean(p));

  function handleGerar() {
    if (!componentes) return;
    const avisoEstoque = "Itens sem estoque na data continuam no orçamento — confira antes de converter em contrato.";
    if (!confirm(`Gerar o orçamento com ${componentes.length} item(ns)?\n\n${avisoEstoque}`)) return;
    setErroGerar(null);
    iniciarGerar(async () => {
      const r = await gerarOrcamentoInteligente({
        clienteId,
        dataEvento,
        horario,
        local,
        cidade,
        convidados: convidados ? Number(convidados) : undefined,
        tema,
        descricao,
        tipoServico,
        horas,
        km,
        fotos: fotosProntas.map((f) => f.caminho!),
        temaIA: resultado?.ok ? resultado.analise.tema : undefined,
        linhas: componentes.map((c) => ({
          descricao: c.descricao,
          quantidade: c.quantidade,
          tipo: c.tipo,
          produtoId: c.produtoId,
          custoUnitario: c.produtoId ? 0 : c.custoUnitario,
          precoUnitario: c.produtoId ? 0 : c.precoUnitario,
          precoManual: c.precoManual,
          confianca: c.confianca,
          confiancaPct: c.confiancaPct,
          daIA: c.observacao !== OBS_MANUAL,
        })),
      });
      if (r.ok) router.push(`/orcamentos/${r.id}`);
      else setErroGerar(r.erro);
    });
  }

  function montarManualmente() {
    setResultado(null);
    setComponentes((prev) => prev ?? []);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {!iaConfigurada && (
        <Aviso cor="var(--gold)">
          <strong>IA não configurada.</strong> Você já pode preencher os dados e enviar as fotos; a análise automática fica
          disponível assim que a chave da IA for cadastrada no servidor.
        </Aviso>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Secao titulo="Referências da decoração">
            <label className="btn btn-g" style={{ cursor: "pointer", opacity: fotos.length >= MAX_FOTOS ? 0.5 : 1 }}>
              + Enviar fotos
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                disabled={fotos.length >= MAX_FOTOS}
                onChange={handleArquivos}
                style={{ display: "none" }}
              />
            </label>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", marginLeft: 10 }}>
              JPG, PNG ou WEBP · até {MAX_FOTOS} fotos
            </span>

            {fotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 14 }}>
                {fotos.map((f) => (
                  <div key={f.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", background: "var(--cream)", aspectRatio: "1" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.previewUrl} alt="Referência enviada" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    {f.status !== "ok" && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.75)", fontSize: 12, fontWeight: 600, color: f.status === "erro" ? "var(--rose-deep)" : "var(--ink-soft)" }}>
                        {f.status === "erro" ? "Falha no envio" : "Enviando..."}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removerFoto(f)}
                      aria-label="Remover foto"
                      style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(42,36,56,.7)", color: "#fff", cursor: "pointer" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Secao>

          <Secao titulo="Descreva o que o cliente pediu">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Ex.: Cliente quer uma decoração de 1 ano, tema fundo do mar, semelhante às fotos enviadas."
              style={{ ...campoStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Secao>
        </div>

        <Secao titulo="Dados do evento">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Campo label="Cliente">
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={campoStyle}>
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input
                    placeholder="ou cadastre rápido..."
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    style={{ ...campoStyle, fontSize: 12.5 }}
                  />
                  <button type="button" className="btn btn-g btn-sm" onClick={handleCriarCliente}>
                    + Add
                  </button>
                </div>
              </Campo>
            </div>
            <Campo label="Data do evento">
              <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} style={campoStyle} />
            </Campo>
            <Campo label="Horário">
              <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} style={campoStyle} />
            </Campo>
            <Campo label="Local">
              <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Salão, residência..." style={campoStyle} />
            </Campo>
            <Campo label="Cidade">
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} style={campoStyle} />
            </Campo>
            <Campo label="Convidados (estimativa)">
              <input type="number" min={0} value={convidados} onChange={(e) => setConvidados(e.target.value)} style={campoStyle} />
            </Campo>
            <Campo label="Tema">
              <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Fundo do mar" style={campoStyle} />
            </Campo>
            <div style={{ gridColumn: "1 / -1" }}>
              <Campo label="Modalidade">
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="radio" checked={tipoServico === "PEGMONTE"} onChange={() => setTipoServico("PEGMONTE")} />
                    Pegue e Monte
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="radio" checked={tipoServico === "PRESENCIAL"} onChange={() => setTipoServico("PRESENCIAL")} />
                    RHEMA Decora no Local
                  </label>
                </div>
              </Campo>
            </div>
          </div>
        </Secao>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          className="btn btn-p"
          disabled={analisando || enviando || fotosProntas.length === 0 || !dataEvento}
          onClick={handleAnalisar}
        >
          {analisando ? "Analisando..." : "✨ Analisar decoração com IA"}
        </button>
        {(fotosProntas.length === 0 || !dataEvento) && (
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Envie ao menos uma foto e informe a data do evento.</span>
        )}
        {enviando && <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Aguarde o envio das fotos...</span>}
        {componentes === null && (
          <button type="button" className="btn btn-g" disabled={analisando} onClick={montarManualmente} style={{ marginLeft: "auto" }}>
            Montar manualmente
          </button>
        )}
      </div>

      {analisando && (
        <Aviso cor="var(--ink-soft)">A IA está analisando as fotos. Isso costuma levar de 20 segundos a 1 minuto.</Aviso>
      )}

      {resultado && !resultado.ok && (
        <Aviso cor={resultado.codigo === "DADOS_INVALIDOS" ? "var(--rose-deep)" : "var(--gold)"}>{resultado.mensagem}</Aviso>
      )}

      {componentes && (
        <ResultadoIA
          analise={resultado?.ok ? resultado.analise : null}
          componentes={componentes}
          setComponentes={setComponentes}
          catalogo={catalogo}
          livre={livre}
          erroEstoque={erroEstoque}
          dataEvento={dataEvento}
          regras={regras}
        />
      )}

      {componentes && (
        <ResumoCustos
          componentes={componentes}
          catalogo={catalogo}
          regras={regras}
          modalidade={tipoServico}
          dataEvento={dataEvento}
          horas={horas}
          setHoras={setHoras}
          km={km}
          setKm={setKm}
          horasDaIA={resultado?.ok === true}
        />
      )}

      {componentes && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-p" disabled={gerando || pendenciasGerar.length > 0} onClick={handleGerar}>
            {gerando ? "Gerando..." : "Gerar orçamento"}
          </button>
          {pendenciasGerar.length > 0 ? (
            <span style={{ fontSize: 12.5, color: "var(--rose-deep)" }}>Antes de gerar: {pendenciasGerar.join(" · ")}</span>
          ) : (
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              O orçamento é criado como pendente, no layout de sempre. Não reserva estoque e pode ser editado depois.
            </span>
          )}
        </div>
      )}
      {erroGerar && <Aviso cor="var(--rose-deep)">{erroGerar}</Aviso>}
    </div>
  );
}

const COR_CONFIANCA = { ALTA: "var(--sage)", MEDIA: "var(--gold)", BAIXA: "var(--rose-deep)" } as const;
const ROTULO_TIPO = { ITEM: "Item", CONSUMIVEL: "Consumível", SERVICO: "Personalizado" } as const;

const OBS_MANUAL = "Adicionado manualmente";

const ROTULO_STATUS: Record<StatusComponente, { texto: string; cor: string }> = {
  DISPONIVEL: { texto: "✅ Disponível", cor: "var(--sage)" },
  INSUFICIENTE: { texto: "🔴 Quantidade insuficiente", cor: "var(--rose-deep)" },
  INDISPONIVEL: { texto: "🔴 Indisponível na data", cor: "var(--rose-deep)" },
  NAO_CADASTRADO: { texto: "⚠️ Não cadastrado", cor: "var(--gold)" },
  CONSUMIVEL_A_COMPRAR: { texto: "🛒 Consumível — a comprar", cor: "var(--gold)" },
  PERSONALIZADO: { texto: "✂️ Personalizado — produzir", cor: "var(--gold)" },
};

function ResultadoIA({
  analise,
  componentes,
  setComponentes,
  catalogo,
  livre,
  erroEstoque,
  dataEvento,
  regras,
}: {
  analise: AnaliseDecoracao | null;
  componentes: Linha[];
  setComponentes: React.Dispatch<React.SetStateAction<Linha[] | null>>;
  catalogo: ProdutoCatalogo[];
  livre: Record<string, number> | null;
  erroEstoque: boolean;
  dataEvento: string;
  regras: RegrasPrecificacao;
}) {
  const nomeProduto = new Map(catalogo.map((p) => [p.id, p.nome]));
  const diaria = new Map(catalogo.map((p) => [p.id, p.precoDiaria ?? 0]));
  const baixas = componentes.filter((c) => c.confianca === "BAIXA").length;
  const status = componentes.map((c) => statusComponente(c.produtoId, c.tipo, c.quantidade, livre?.[c.produtoId]));
  const faltando = status.filter((s) => s === "INSUFICIENTE" || s === "INDISPONIVEL").length;

  // Um mesmo produto vinculado a duas linhas consome o mesmo estoque.
  const pedidoPorProduto = new Map<string, number>();
  for (const c of componentes) if (c.produtoId) pedidoPorProduto.set(c.produtoId, (pedidoPorProduto.get(c.produtoId) ?? 0) + c.quantidade);
  const duplicados = [...pedidoPorProduto].filter(([id, qtd]) => livre && qtd > (livre[id] ?? 0) && componentes.filter((c) => c.produtoId === id).length > 1);

  function atualizar(i: number, mudanca: Partial<Linha>) {
    setComponentes(
      (prev) =>
        prev &&
        prev.map((c, j) => {
          if (j !== i) return c;
          const nova = { ...c, ...mudanca };
          // Enquanto a usuária não digitar um preço, ele acompanha custo × markup.
          if (!nova.precoManual) nova.precoUnitario = precoVendaSugerido(nova.custoUnitario, nova.tipo, regras);
          return nova;
        })
    );
  }
  function remover(i: number) {
    setComponentes((prev) => prev && prev.filter((_, j) => j !== i));
  }
  function adicionar() {
    setComponentes((prev) => [
      ...(prev ?? []),
      { descricao: "", quantidade: 1, confianca: "ALTA", confiancaPct: 100, produtoId: "", tipo: "ITEM", observacao: OBS_MANUAL, materiais: [], ...SEM_PRECO },
    ]);
  }

  return (
    <Secao titulo={analise ? "Análise da IA" : "Composição da decoração"}>
      {analise && (
        <div style={{ fontSize: 13.5, marginBottom: 12 }}>
          <strong>Tema:</strong> {analise.tema || "—"} · <strong>Evento:</strong> {analise.tipoEvento || "—"}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {!dataEvento && <Aviso cor="var(--gold)">Informe a data do evento para verificar o estoque.</Aviso>}
        {dataEvento && ehSabado(dataEvento) && (
          <Aviso cor="var(--gold)">A data cai num sábado — na fase inicial, sábados estão indisponíveis na agenda. Confirme antes de seguir.</Aviso>
        )}
        {erroEstoque && <Aviso cor="var(--rose-deep)">Não foi possível consultar o estoque agora. Tente trocar a data ou recarregar a página.</Aviso>}
        {faltando > 0 && <Aviso cor="var(--rose-deep)">{faltando} item(ns) sem estoque suficiente na data do evento.</Aviso>}
        {duplicados.length > 0 && (
          <Aviso cor="var(--rose-deep)">
            O mesmo produto está em mais de uma linha e a soma passa do estoque livre:{" "}
            {duplicados.map(([id]) => nomeProduto.get(id)).join(", ")}.
          </Aviso>
        )}
        {baixas > 0 && <Aviso cor="var(--rose-deep)">{baixas} item(ns) com confiança baixa — confira nas fotos antes de usar no orçamento.</Aviso>}
      </div>

      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--ink-soft)", fontSize: 11.5 }}>
            <th style={th}>Item</th>
            <th style={{ ...th, width: 70 }}>Qtd.</th>
            <th style={th}>Tipo</th>
            <th style={th}>Produto no catálogo RHEMA</th>
            <th style={th}>Estoque na data</th>
            <th style={th}>Custo un. (interno)</th>
            <th style={th}>Preço un. (cliente)</th>
            <th style={{ ...th, textAlign: "right" }}>Confiança</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {componentes.map((c, i) => {
            const sugestoes = c.produtoId ? [] : sugerirProdutos(c.descricao, catalogo);
            const st = ROTULO_STATUS[status[i]];
            const livreItem = c.produtoId ? livre?.[c.produtoId] : undefined;
            return (
              <tr key={i} style={{ borderTop: "1px solid var(--line)", verticalAlign: "top" }}>
                <td style={td}>
                  <input
                    value={c.descricao}
                    onChange={(e) => atualizar(i, { descricao: e.target.value })}
                    placeholder="Descrição do item"
                    style={{ ...campoStyle, padding: "5px 7px", minWidth: 160 }}
                  />
                  {c.observacao && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>{c.observacao}</div>}
                  {c.materiais.length > 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>
                      Materiais: {c.materiais.map((m) => `${m.quantidade} ${m.unidade} ${m.descricao}`).join(" · ")}
                    </div>
                  )}
                </td>
                <td style={td}>
                  <input
                    type="number"
                    min={1}
                    value={c.quantidade}
                    onChange={(e) => atualizar(i, { quantidade: Math.max(1, Number(e.target.value) || 1) })}
                    style={{ ...campoStyle, padding: "5px 7px", minWidth: 60 }}
                  />
                </td>
                <td style={td}>
                  <select value={c.tipo} onChange={(e) => atualizar(i, { tipo: e.target.value as ComponenteIA["tipo"] })} style={{ ...campoStyle, padding: "5px 7px", minWidth: 118 }}>
                    {Object.entries(ROTULO_TIPO).map(([v, r]) => (
                      <option key={v} value={v}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <select value={c.produtoId} onChange={(e) => atualizar(i, { produtoId: e.target.value })} style={{ ...campoStyle, padding: "5px 7px", minWidth: 170 }}>
                    <option value="">— não usar item do catálogo —</option>
                    {sugestoes.length > 0 && (
                      <optgroup label="Parecidos">
                        {sugestoes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Todo o catálogo">
                      {catalogo.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {sugestoes.length > 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--gold)", marginTop: 3 }}>
                      Talvez seja: {sugestoes.map((p) => p.nome).join(" ou ")}?
                    </div>
                  )}
                </td>
                <td style={{ ...td, color: st.cor, fontWeight: 600 }}>
                  {c.produtoId && livreItem === undefined ? (
                    <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>
                      {!dataEvento ? "informe a data" : erroEstoque ? "—" : "consultando..."}
                    </span>
                  ) : (
                    <>
                      {st.texto}
                      {livreItem !== undefined && <div style={{ fontSize: 11.5, fontWeight: 400 }}>{livreItem} livre(s)</div>}
                    </>
                  )}
                </td>
                {c.produtoId ? (
                  <>
                    <td style={{ ...td, color: "var(--ink-soft)", fontSize: 12 }}>item próprio</td>
                    <td style={td}>
                      {brl(diaria.get(c.produtoId) ?? 0)}
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>diária do catálogo</div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={td}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={c.custoUnitario || ""}
                        placeholder="0,00"
                        onChange={(e) => atualizar(i, { custoUnitario: Math.max(0, Number(e.target.value)) })}
                        style={{ ...campoStyle, padding: "5px 7px", minWidth: 84 }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={c.precoUnitario || ""}
                        placeholder="0,00"
                        onChange={(e) => atualizar(i, { precoUnitario: Math.max(0, Number(e.target.value)), precoManual: true })}
                        style={{ ...campoStyle, padding: "5px 7px", minWidth: 84 }}
                      />
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                        {c.precoManual ? (
                          <button type="button" onClick={() => atualizar(i, { precoManual: false })} style={{ color: "var(--rose-deep)", fontSize: 11 }}>
                            usar markup
                          </button>
                        ) : (
                          `custo + ${regras.markupPct}%${c.tipo === "CONSUMIVEL" ? " + perdas" : ""}`
                        )}
                      </div>
                    </td>
                  </>
                )}
                <td style={{ ...td, textAlign: "right", color: COR_CONFIANCA[c.confianca], fontWeight: 600, whiteSpace: "nowrap" }}>
                  {c.observacao === OBS_MANUAL ? (
                    <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>manual</span>
                  ) : (
                    <>
                      {c.confiancaPct}%{c.confianca === "BAIXA" && " · revisar"}
                    </>
                  )}
                </td>
                <td style={td}>
                  <button type="button" className="btn btn-x" aria-label="Excluir item" onClick={() => remover(i)}>
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
          {componentes.length === 0 && (
            <tr>
              <td style={td} colSpan={9}>
                Nenhum item ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <button type="button" className="btn btn-g btn-sm" onClick={adicionar} style={{ marginTop: 10 }}>
        + Adicionar item
      </button>

      {analise && (
        <>
          <div style={{ fontSize: 13, marginTop: 14 }}>
            <strong>Tempo estimado (sugestão da IA):</strong> produção {analise.horasEstimadas.producao}h · montagem{" "}
            {analise.horasEstimadas.montagem}h · desmontagem {analise.horasEstimadas.desmontagem}h
          </div>
          {analise.observacoes && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6 }}>{analise.observacoes}</div>}
        </>
      )}
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12 }}>
        Próximas etapas: preços, custos e revisão final antes de gerar o orçamento. Nada é reservado nesta tela.
      </div>
    </Secao>
  );
}

type Horas = { producao: number; montagem: number; desmontagem: number };

function ResumoCustos({
  componentes,
  catalogo,
  regras,
  modalidade,
  dataEvento,
  horas,
  setHoras,
  km,
  setKm,
  horasDaIA,
}: {
  componentes: Linha[];
  catalogo: ProdutoCatalogo[];
  regras: RegrasPrecificacao;
  modalidade: TipoServico;
  dataEvento: string;
  horas: Horas;
  setHoras: (h: Horas) => void;
  km: number;
  setKm: (v: number) => void;
  horasDaIA: boolean;
}) {
  const diaria = new Map(catalogo.map((p) => [p.id, p.precoDiaria ?? 0]));
  const presencial = modalidade === "PRESENCIAL";
  const r = calcularOrcamento({
    modalidade,
    dataEvento: dataEvento || undefined,
    horas,
    km,
    regras,
    linhas: componentes.map((c) => ({
      descricao: c.descricao,
      quantidade: c.quantidade,
      tipo: c.tipo,
      produtoId: c.produtoId || undefined,
      precoDiaria: c.produtoId ? diaria.get(c.produtoId) : undefined,
      custoUnitario: c.custoUnitario,
      precoUnitario: c.precoUnitario,
    })),
  });
  const corMargem = r.precoSugerido === 0 ? "var(--ink-soft)" : r.margemPct < regras.margemMinimaPct ? "var(--rose-deep)" : "var(--sage)";

  return (
    <Secao titulo="Custos e preço sugerido">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Campo label={`Produção (h)${horasDaIA ? " · sugestão IA" : ""}`}>
          <input type="number" min={0} step="0.5" value={horas.producao} onChange={(e) => setHoras({ ...horas, producao: Math.max(0, Number(e.target.value)) })} style={campoStyle} />
        </Campo>
        <Campo label="Montagem (h)">
          <input type="number" min={0} step="0.5" disabled={!presencial} value={horas.montagem} onChange={(e) => setHoras({ ...horas, montagem: Math.max(0, Number(e.target.value)) })} style={campoStyle} />
        </Campo>
        <Campo label="Desmontagem (h)">
          <input type="number" min={0} step="0.5" disabled={!presencial} value={horas.desmontagem} onChange={(e) => setHoras({ ...horas, desmontagem: Math.max(0, Number(e.target.value)) })} style={campoStyle} />
        </Campo>
        <Campo label="Km (ida e volta)">
          <input type="number" min={0} disabled={!presencial} value={km} onChange={(e) => setKm(Math.max(0, Number(e.target.value)))} style={campoStyle} />
        </Campo>
      </div>
      {!presencial && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
          Pegue e Monte: montagem, desmontagem e deslocamento não entram (o cliente retira e monta). A produção/personalização continua contando como custo.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 6 }}>Custo interno</div>
          <LinhaValor rotulo="Materiais de consumo (com perdas)" valor={r.custoMateriais} />
          <LinhaValor rotulo="Itens novos / personalizados" valor={r.custoItensNovos} />
          <LinhaValor rotulo="Uso de itens próprios" valor={r.custoUtilizacao} />
          <LinhaValor rotulo="Mão de obra" valor={r.custoMaoDeObra} />
          <LinhaValor rotulo="Deslocamento" valor={r.custoDeslocamento} />
          <LinhaValor rotulo={`Contingência (${regras.contingenciaPct}%)`} valor={r.custoContingencia} />
          <LinhaValor rotulo="Custo estimado" valor={r.custoEstimado} destaque />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 6 }}>Preço ao cliente</div>
          <LinhaValor rotulo="Locação de itens RHEMA" valor={r.receitaLocacao} />
          <LinhaValor rotulo="Itens avulsos e materiais" valor={r.receitaAvulsos} />
          {presencial && <LinhaValor rotulo="Serviço (montagem, mão de obra, deslocamento)" valor={r.receitaServico} />}
          {r.adicionalPersonalizacao > 0 && <LinhaValor rotulo={`Adicional personalização (${regras.adicionalPersonalizacaoPct}%)`} valor={r.adicionalPersonalizacao} />}
          {r.adicionalUrgencia > 0 && <LinhaValor rotulo={`Adicional urgência (${regras.adicionalUrgenciaPct}%)`} valor={r.adicionalUrgencia} />}
          <LinhaValor rotulo="Preço sugerido" valor={r.precoSugerido} destaque />
          <LinhaValor rotulo={`Preço mínimo (margem ${regras.margemMinimaPct}%)`} valor={r.precoMinimo} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13.5, fontWeight: 700, color: corMargem }}>
            <span>Margem estimada</span>
            <span>{r.precoSugerido > 0 ? `${r.margemPct.toFixed(1)}%` : "—"}</span>
          </div>
        </div>
      </div>

      {r.alertas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {r.alertas.map((a) => (
            <Aviso key={a} cor="var(--rose-deep)">
              🔴 {a}
            </Aviso>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 12 }}>
        Valores calculados com as regras de precificação atuais. O cliente verá apenas os preços, nunca os custos internos.
      </div>
    </Secao>
  );
}

function LinhaValor({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        fontSize: destaque ? 14.5 : 13,
        fontWeight: destaque ? 700 : 400,
        borderTop: destaque ? "1px solid var(--line)" : undefined,
        marginTop: destaque ? 4 : 0,
      }}
    >
      <span>{rotulo}</span>
      <span>{brl(valor)}</span>
    </div>
  );
}

const th: React.CSSProperties = { padding: "4px 6px" };
const td: React.CSSProperties = { padding: "7px 6px" };

function Aviso({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", border: `1px solid ${cor}`, borderLeft: `4px solid ${cor}`, borderRadius: 10, padding: "12px 16px", fontSize: 13.5 }}>
      {children}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
      <div style={{ fontFamily: "var(--font-d)", fontSize: 16, marginBottom: 12 }}>{titulo}</div>
      {children}
    </div>
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
