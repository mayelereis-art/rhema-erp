/**
 * Cláusulas padrão impressas no contrato de locação (kits peg&monte e peças
 * avulsas). Texto fixo — não depende de dados do contrato, por isso fica
 * separado do componente de UI para poder ser reaproveitado/editado num só lugar.
 */
export const CLAUSULAS_CONTRATO: Array<{ titulo: string; texto: string }> = [
  {
    titulo: "Do objeto",
    texto:
      "Este contrato tem por objeto a locação dos itens de decoração descritos na tabela acima, pertencentes à RHEMA PERSONALIZADOS E DECORAÇÕES LTDA (\"LOCADORA\"), ao CONTRATANTE acima identificado, para uso exclusivo no evento e período informados.",
  },
  {
    titulo: "Do prazo",
    texto:
      "Os itens deverão ser retirados/entregues e devolvidos nas datas e horários acordados. O atraso na devolução sem aviso prévio sujeita o CONTRATANTE à cobrança de diária adicional proporcional ao valor locado, por dia de atraso.",
  },
  {
    titulo: "Da responsabilidade pelos itens",
    texto:
      "O CONTRATANTE é responsável pela guarda, conservação e uso adequado dos itens desde o recebimento (retirada ou entrega) até a efetiva devolução à LOCADORA.",
  },
  {
    titulo: "De avarias, perdas e danos",
    texto:
      "Em caso de avaria, quebra, mancha, perda ou extravio de qualquer item, o CONTRATANTE se compromete a ressarcir a LOCADORA pelo valor de reposição do item (preço de mercado para aquisição de item novo equivalente) ou pelo custo do conserto, conforme avaliação da LOCADORA.",
  },
  {
    titulo: "Da limpeza",
    texto:
      "Itens devolvidos sujos por uso indevido (ex.: cera, alimentos, bebidas, maquiagem) poderão ser cobrados com taxa adicional de limpeza, informada ao CONTRATANTE no momento da devolução.",
  },
  {
    titulo: "Do pagamento",
    texto:
      "O pagamento seguirá as parcelas descritas neste contrato. O não pagamento de qualquer parcela na data de vencimento poderá acarretar a suspensão da entrega/montagem dos itens até a regularização.",
  },
  {
    titulo: "Do cancelamento",
    texto:
      "Cancelamentos solicitados pelo CONTRATANTE estão sujeitos à retenção do valor de sinal já pago, a título de reserva de data e indisponibilização da agenda da LOCADORA para outros clientes no período.",
  },
  {
    titulo: "Da montagem e desmontagem",
    texto:
      "Nos serviços com decoração presencial, a montagem e a desmontagem são de responsabilidade da LOCADORA, devendo o CONTRATANTE garantir acesso ao local da decoração nos horários combinados.",
  },
  {
    titulo: "Do foro",
    texto: "Fica eleito o foro da comarca de Guararema/SP para dirimir quaisquer questões oriundas deste contrato.",
  },
];
