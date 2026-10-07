/**
 * Datas de calendário (início/fim de locação, vencimentos) são gravadas a partir
 * do "YYYY-MM-DD" do formulário, o que vira meia-noite em UTC. Exibir isso no
 * fuso do Brasil (UTC−3) mostrava o dia anterior — por isso essas datas são
 * formatadas em UTC. Instantes reais (ex.: criadoEm) usam o horário de Brasília.
 */

export function formatarData(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHora(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
