"use client";

import { useState, useTransition } from "react";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase-client";
import { comprimirImagem } from "@/lib/imagem-cliente";
import { criarCliente } from "@/lib/clientes";
import { analisarDecoracao, type ResultadoAnalise } from "@/lib/orcamento-ia";
import type { Cliente, TipoServico } from "@/lib/firestore-schema";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTOS = 8;

interface Foto {
  id: string;
  previewUrl: string;
  caminho?: string; // preenchido quando o upload termina
  status: "enviando" | "ok" | "erro";
}

export function OrcamentoInteligente({ clientes: clientesIniciais, iaConfigurada }: { clientes: Cliente[]; iaConfigurada: boolean }) {
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
    });
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
      </div>

      {resultado && !resultado.ok && (
        <Aviso cor={resultado.codigo === "DADOS_INVALIDOS" ? "var(--rose-deep)" : "var(--gold)"}>{resultado.mensagem}</Aviso>
      )}
    </div>
  );
}

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
