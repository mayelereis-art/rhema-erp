"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Cliente, ItemContrato, ModoLogistica, Produto, TipoServico, Usuario } from "@/lib/firestore-schema";
import { criarCliente } from "@/lib/clientes";
import { criarContrato, validarDisponibilidadeContrato, type ErroDisponibilidade } from "@/lib/contratos";
import { calcularRateio, gerarParcelas } from "@/lib/rateio";
import { CalculadoraCustoPresencial } from "../../calculadora-custo-presencial";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const MAPA_TIPO: Record<TipoServico, "presencial" | "pegmonte"> = {
  PRESENCIAL: "presencial",
  PEGMONTE: "pegmonte",
};

export function ContratoBuilder({
  clientes: clientesIniciais,
  produtos,
  usuarios,
}: {
  clientes: Cliente[];
  produtos: Produto[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [clientes, setClientes] = useState(clientesIniciais);
  const [clienteId, setClienteId] = useState("");
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [evento, setEvento] = useState("");
  const [inicio, setInicio] = useState(hoje());
  const [fim, setFim] = useState(hoje());
  const [tipoServico, setTipoServico] = useState<TipoServico>("PRESENCIAL");
  const [custos, setCustos] = useState(0);
  const [executoraId, setExecutoraId] = useState("");
  const [modoLogistica, setModoLogistica] = useState<ModoLogistica>("RETIRADA");
  const [endereco, setEndereco] = useState("");
  const [itens, setItens] = useState<ItemContrato[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
  const [erros, setErros] = useState<ErroDisponibilidade[]>([]);
  const [pendente, iniciar] = useTransition();

  const total = useMemo(() => itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0), [itens]);
  const valorMontagem = tipoServico === "PRESENCIAL" ? custos : 0;
  const valorFaturado = total + valorMontagem;
  const rateio = useMemo(() => calcularRateio(total, custos, MAPA_TIPO[tipoServico]), [total, custos, tipoServico]);
  const parcelas = useMemo(
    () => (valorFaturado > 0 ? gerarParcelas(valorFaturado, inicio, fim) : []),
    [valorFaturado, inicio, fim]
  );

  function nomeProduto(id: string) {
    return produtos.find((p) => p.id === id)?.nome ?? "";
  }

  async function handleCriarCliente() {
    if (!novoClienteNome.trim()) return;
    const id = await criarCliente({ nome: novoClienteNome.trim() });
    const novo: Cliente = { id, nome: novoClienteNome.trim(), criadoEm: undefined as never };
    setClientes((prev) => [...prev, novo]);
    setClienteId(id);
    setNovoClienteNome("");
  }

  function adicionarItem() {
    if (!produtoSelecionado || quantidadeSelecionada <= 0) return;
    const produto = produtos.find((p) => p.id === produtoSelecionado);
    if (!produto) return;

    setItens((prev) => {
      const existente = prev.find((i) => i.produtoId === produtoSelecionado);
      if (existente) {
        return prev.map((i) => (i.produtoId === produtoSelecionado ? { ...i, quantidade: i.quantidade + quantidadeSelecionada } : i));
      }
      return [...prev, { produtoId: produtoSelecionado, quantidade: quantidadeSelecionada, precoUnitario: produto.precoDiaria }];
    });
    setProdutoSelecionado("");
    setQuantidadeSelecionada(1);
    setErros([]);
  }

  function removerItem(produtoId: string) {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  function atualizarPreco(produtoId: string, precoUnitario: number) {
    setItens((prev) => prev.map((i) => (i.produtoId === produtoId ? { ...i, precoUnitario } : i)));
  }

  async function handleSalvar() {
    if (!clienteId || itens.length === 0) {
      alert("Selecione um cliente e adicione ao menos um item.");
      return;
    }

    iniciar(async () => {
      const validacao = await validarDisponibilidadeContrato(itens, inicio, fim);
      if (validacao.length > 0) {
        setErros(validacao);
        return;
      }

      const resultado = await criarContrato({
        clienteId,
        evento,
        inicio,
        fim,
        tipoServico,
        custos,
        executoraId: executoraId || undefined,
        modoLogistica,
        endereco: modoLogistica === "ENTREGA" ? endereco : undefined,
        itens,
      });

      if (resultado.ok) {
        router.push(`/contratos/${resultado.id}`);
      } else {
        setErros(resultado.erros);
      }
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 22, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Secao titulo="Cliente e evento">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <Campo label="Evento">
              <input value={evento} onChange={(e) => setEvento(e.target.value)} style={campoStyle} placeholder="Aniversário, chá de bebê..." />
            </Campo>
            <Campo label="Retirada">
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={campoStyle} />
            </Campo>
            <Campo label="Devolução">
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} style={campoStyle} />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Itens">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <select value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)} style={{ ...campoStyle, flex: 1 }}>
              <option value="">Selecione um produto...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.nome} — R$ {p.precoDiaria.toFixed(2)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={quantidadeSelecionada}
              onChange={(e) => setQuantidadeSelecionada(Number(e.target.value))}
              style={{ ...campoStyle, width: 80 }}
            />
            <button type="button" className="btn btn-g" onClick={adicionarItem}>
              Adicionar
            </button>
          </div>

          {itens.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-soft)", fontSize: 11.5 }}>
                  <th style={{ padding: "4px 0" }}>Produto</th>
                  <th style={{ padding: "4px 0", textAlign: "right" }}>Qtd.</th>
                  <th style={{ padding: "4px 0", textAlign: "right" }}>Preço/diária</th>
                  <th style={{ padding: "4px 0", textAlign: "right" }}>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => {
                  const erro = erros.find((e) => e.produtoId === i.produtoId);
                  return (
                    <tr key={i.produtoId} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "6px 0" }}>
                        {nomeProduto(i.produtoId)}
                        {erro && (
                          <div style={{ color: "var(--rose-deep)", fontSize: 11.5 }}>
                            Só há {erro.livre} livre(s) no período (pedido: {erro.pedido}).
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "6px 0", textAlign: "right" }}>{i.quantidade}</td>
                      <td style={{ padding: "6px 0", textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          value={i.precoUnitario}
                          onChange={(e) => atualizarPreco(i.produtoId, Number(e.target.value))}
                          style={{ width: 90, textAlign: "right", padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line)" }}
                        />
                      </td>
                      <td style={{ padding: "6px 0", textAlign: "right" }}>R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</td>
                      <td style={{ padding: "6px 0", textAlign: "right" }}>
                        <button type="button" className="btn btn-x" onClick={() => removerItem(i.produtoId)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Secao>

        <Secao titulo="Serviço e logística">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo label="Tipo de serviço (define o rateio)">
              <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value as TipoServico)} style={campoStyle}>
                <option value="PRESENCIAL">Presencial (decoração no local)</option>
                <option value="PEGMONTE">Peg&Monte (retirada pelo cliente)</option>
              </select>
            </Campo>
            <Campo label="Custos do serviço (R$)">
              <input type="number" step="0.01" value={custos} onChange={(e) => setCustos(Number(e.target.value))} style={campoStyle} />
            </Campo>
            <Campo label="Quem executa">
              <select value={executoraId} onChange={(e) => setExecutoraId(e.target.value)} style={campoStyle}>
                <option value="">—</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Logística">
              <select value={modoLogistica} onChange={(e) => setModoLogistica(e.target.value as ModoLogistica)} style={campoStyle}>
                <option value="RETIRADA">Cliente retira</option>
                <option value="ENTREGA">Entrega em Guararema</option>
              </select>
            </Campo>
            {modoLogistica === "ENTREGA" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Campo label="Endereço de entrega">
                  <input value={endereco} onChange={(e) => setEndereco(e.target.value)} style={campoStyle} />
                </Campo>
              </div>
            )}
            {tipoServico === "PRESENCIAL" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <CalculadoraCustoPresencial onAplicar={setCustos} />
              </div>
            )}
          </div>
        </Secao>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-p" disabled={pendente} onClick={handleSalvar}>
            {pendente ? "Salvando..." : "Criar contrato"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Secao titulo="Resumo">
          <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span>Valor da locação</span>
            <strong>R$ {total.toFixed(2)}</strong>
          </div>
          {valorMontagem > 0 && (
            <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>Valor da montagem</span>
              <strong>R$ {valorMontagem.toFixed(2)}</strong>
            </div>
          )}
          <div style={{ fontFamily: "var(--font-d)", fontSize: 24, marginTop: 6 }}>R$ {valorFaturado.toFixed(2)}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>Total cobrado do cliente</div>
        </Secao>

        <Secao titulo={`Rateio societário · ${rateio.regra.rotulo}`}>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>
            Custos: R$ {rateio.custos.toFixed(2)} · Lucro líquido: R$ {rateio.lucro.toFixed(2)}
          </div>
          {rateio.fatias.map((f) => (
            <div key={f.destino} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span>
                {f.rotulo} <span style={{ color: "var(--ink-soft)" }}>({f.pct}%)</span>
              </span>
              <strong>R$ {f.valor.toFixed(2)}</strong>
            </div>
          ))}
        </Secao>

        {parcelas.length > 0 && (
          <Secao titulo="Parcelas">
            {parcelas.map((p) => (
              <div key={p.rotulo} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                <span>{p.rotulo}</span>
                <strong>R$ {p.valor.toFixed(2)}</strong>
              </div>
            ))}
          </Secao>
        )}
      </div>
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
