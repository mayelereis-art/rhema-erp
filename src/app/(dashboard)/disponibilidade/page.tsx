import { PageHeader } from "../page-header";
import { DisponibilidadeClient } from "./disponibilidade-client";

export default function DisponibilidadePage() {
  return (
    <>
      <PageHeader titulo="Disponibilidade" legenda="Confira o estoque livre por período antes de fechar" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <DisponibilidadeClient />
      </div>
    </>
  );
}
