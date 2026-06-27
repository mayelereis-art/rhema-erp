import type { TipoServico } from "./firestore-schema";

/**
 * Cláusulas do contrato de locação, condicionais por modalidade
 * (PRESENCIAL com montagem vs PEGMONTE/Pegue e Monte). Texto-base alinhado ao
 * modelo jurídico da Rhema (Contrato_Locacao_Decoracao_Rhema.docx).
 */

const ROTULO_MODALIDADE: Record<TipoServico, string> = {
  PRESENCIAL: "Presencial com Montagem",
  PEGMONTE: "Pegue e Monte",
};

export function rotuloModalidade(tipo: TipoServico): string {
  return ROTULO_MODALIDADE[tipo];
}

export function obterClausulas(tipo: TipoServico): Array<{ titulo: string; texto: string }> {
  const presencial = tipo === "PRESENCIAL";

  return [
    {
      titulo: "Da modalidade contratada",
      texto: presencial
        ? "Modalidade PRESENCIAL COM MONTAGEM: a LOCADORA realiza a montagem, ambientação e desmontagem dos itens no local e data indicados, mediante o valor de serviço previsto no orçamento."
        : "Modalidade PEGUE E MONTE (locação simples): a montagem, desmontagem, transporte, carga e descarga dos itens são de inteira responsabilidade do(a) LOCATÁRIO(A).",
    },
    {
      titulo: "Do objeto",
      texto:
        "O presente contrato tem por objeto a locação dos bens móveis para decoração descritos e fotografados no Anexo I — Relação de Itens Locados, parte integrante deste instrumento, cujos itens, quantidades e valores correspondem ao orçamento/pedido aprovado pelo(a) CONTRATANTE." +
        (presencial
          ? " Integra ainda o objeto a prestação dos serviços de montagem, ambientação e desmontagem dos itens, conforme escopo e valores definidos no orçamento."
          : ""),
    },
    {
      titulo: "Do prazo e do local",
      texto: presencial
        ? "A LOCADORA realizará a montagem no endereço, data e horário acordados, e a desmontagem ao término do evento, conforme combinado entre as partes."
        : "A devolução deverá ocorrer na data e horário acordados, no mesmo estado em que os bens foram retirados, ressalvado o desgaste natural decorrente do uso normal e adequado.",
    },
    {
      titulo: "Do preço e da forma de pagamento",
      texto:
        "Pela locação dos bens" +
        (presencial ? " e pelos serviços de montagem" : "") +
        ", o(a) CONTRATANTE pagará à LOCADORA o valor total discriminado neste contrato, em duas parcelas: 50% (sinal/arras confirmatórias) no ato da reserva — condição indispensável para a efetiva reserva dos itens e da data — e 50% (saldo) " +
        (presencial ? "previamente ao início da montagem" : "no ato da retirada dos itens") +
        ". Enquanto não confirmado o sinal, o orçamento não caracteriza reserva, podendo os itens e a data ser disponibilizados a terceiros.",
    },
    {
      titulo: "Da reserva, do sinal e do cancelamento",
      texto:
        "O valor pago a título de sinal (50%) tem natureza de arras confirmatórias. Em caso de desistência ou cancelamento por parte do(a) CONTRATANTE, o sinal não será restituído, ressarcindo a LOCADORA pela indisponibilização dos itens e da data no período. Caso o cancelamento parta da LOCADORA, o valor recebido será integralmente devolvido.",
    },
    {
      titulo: "Das obrigações das partes",
      texto: presencial
        ? "A LOCADORA entrega os bens em condições adequadas, registra fotograficamente o estado dos itens na retirada/entrega e realiza a montagem, ambientação e desmontagem com zelo. O(A) CONTRATANTE deve garantir o acesso ao local na data e horário acordados e disponibilizar condições adequadas para a montagem (espaço, energia, segurança), além de zelar pelos itens durante o evento."
        : "A LOCADORA entrega os bens em condições adequadas e registra fotograficamente o estado dos itens na retirada. O(A) CONTRATANTE responsabiliza-se pelo transporte, carga, descarga, montagem e desmontagem dos itens, devendo conferir o estado de conservação no ato da retirada.",
    },
    {
      titulo: "Da avaria, perda ou extravio dos bens",
      texto:
        "O(A) CONTRATANTE recebe os bens em perfeito estado de conservação, conforme as fotografias do Anexo I, e obriga-se a devolvê-los nas mesmas condições. Considera-se avaria qualquer dano, mancha, quebra, trinca ou alteração que comprometa a estética ou funcionalidade do bem, excetuado o desgaste natural. Em caso de avaria irreparável, perda ou extravio, o(a) CONTRATANTE pagará o valor de reposição do bem indicado no Anexo I ou, na sua ausência, o valor de mercado para item equivalente." +
        (presencial
          ? " Ficam excluídos da responsabilidade do(a) CONTRATANTE os danos comprovadamente causados pela própria equipe da LOCADORA durante a montagem ou desmontagem."
          : ""),
    },
    ...(presencial
      ? []
      : [
          {
            titulo: "Do atraso na devolução",
            texto:
              "A devolução dos bens fora do prazo acordado sujeitará o(a) CONTRATANTE ao pagamento de multa diária correspondente a 20% (vinte por cento) sobre o valor da locação dos itens em atraso, por dia de atraso, sem prejuízo da cobrança de eventuais perdas e danos.",
          },
        ]),
    {
      titulo: "Da responsabilidade durante a locação",
      texto:
        "A partir da retirada/entrega e até a efetiva devolução ou desmontagem e conferência, o(a) CONTRATANTE é responsável pela guarda, segurança e integridade dos bens locados. A LOCADORA não se responsabiliza por danos a terceiros decorrentes do uso inadequado dos itens" +
        (presencial ? "." : ", nem por montagem incorreta ou transporte realizados pelo(a) CONTRATANTE."),
    },
    {
      titulo: "Da proteção de dados",
      texto:
        "Os dados pessoais fornecidos pelo(a) CONTRATANTE serão tratados exclusivamente para a execução deste contrato, em conformidade com a Lei nº 13.709/2018 (LGPD), não sendo compartilhados com terceiros sem autorização, salvo determinação legal.",
    },
    {
      titulo: "Do foro",
      texto: "Fica eleito o foro da comarca de Guararema/SP para dirimir quaisquer questões oriundas deste contrato.",
    },
  ];
}
