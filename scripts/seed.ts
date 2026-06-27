/**
 * Popula o Firestore e cria os usuários no Firebase Auth.
 * Requer FIREBASE_SERVICE_ACCOUNT_KEY no .env (veja .env.example).
 *
 * Uso: npm run db:seed
 */
import "dotenv/config";
import { adminAuth, adminDb } from "../src/lib/firebase-admin";
import { COLECOES, type Papel } from "../src/lib/firestore-schema";
import { gerarParcelas } from "../src/lib/rateio";
import { Timestamp } from "firebase-admin/firestore";

const SENHA_PADRAO = "rhema123";

async function criarUsuario(nome: string, email: string, papel: Papel) {
  let uid: string;
  try {
    const existente = await adminAuth.getUserByEmail(email);
    uid = existente.uid;
  } catch {
    const criado = await adminAuth.createUser({ email, password: SENHA_PADRAO, displayName: nome });
    uid = criado.uid;
  }

  await adminAuth.setCustomUserClaims(uid, { papel });
  await adminDb.collection(COLECOES.usuarios).doc(uid).set({
    nome,
    email,
    papel,
    criadoEm: Timestamp.now(),
  });

  return uid;
}

async function main() {
  const maiele = await criarUsuario("Maiele", "maiele@rhema.com", "ADMIN");
  const michele = await criarUsuario("Michele", "michele@rhema.com", "SOCIA");
  await criarUsuario("Cássia", "cassia@rhema.com", "SOCIA");

  // categorias
  const categorias = {
    paineis: "Painéis & Arcos",
    mobiliario: "Mobiliário",
    kits: "Kits Temáticos",
  };
  const categoriaIds: Record<string, string> = {};
  for (const [chave, nome] of Object.entries(categorias)) {
    const ref = adminDb.collection(COLECOES.categorias).doc();
    await ref.set({ nome });
    categoriaIds[chave] = ref.id;
  }

  // fornecedores
  const balaoRef = adminDb.collection(COLECOES.fornecedores).doc();
  await balaoRef.set({
    nome: "Balão & Cia Atacado",
    telefone: "11 4002-8922",
    fornece: "Balões metalizados e látex",
    criadoEm: Timestamp.now(),
  });
  const movelRef = adminDb.collection(COLECOES.fornecedores).doc();
  await movelRef.set({
    nome: "Mobiliário Festa SP",
    telefone: "11 3033-1100",
    fornece: "Mesas, cadeiras, cilindros",
    criadoEm: Timestamp.now(),
  });

  // produtos
  async function criarProduto(data: {
    nome: string;
    emoji: string;
    precoDiaria: number;
    quantidade: number;
    destaque?: boolean;
    categoriaId?: string;
    fornecedorId?: string;
  }) {
    const ref = adminDb.collection(COLECOES.produtos).doc();
    await ref.set({ destaque: false, ...data, criadoEm: Timestamp.now() });
    return ref.id;
  }

  const arcoId = await criarProduto({
    nome: "Arco de balões orgânico",
    emoji: "🎈",
    precoDiaria: 280,
    quantidade: 4,
    destaque: true,
    categoriaId: categoriaIds.paineis,
    fornecedorId: balaoRef.id,
  });
  const mesaId = await criarProduto({
    nome: "Mesa provençal branca",
    emoji: "🪑",
    precoDiaria: 120,
    quantidade: 8,
    categoriaId: categoriaIds.mobiliario,
    fornecedorId: movelRef.id,
  });
  const tronoId = await criarProduto({
    nome: "Trono dourado infantil",
    emoji: "👑",
    precoDiaria: 150,
    quantidade: 2,
    categoriaId: categoriaIds.mobiliario,
  });
  await criarProduto({
    nome: "Backdrop floral",
    emoji: "🌸",
    precoDiaria: 340,
    quantidade: 3,
    destaque: true,
    categoriaId: categoriaIds.paineis,
  });
  await criarProduto({
    nome: "Kit chá de bebê completo",
    emoji: "🍼",
    precoDiaria: 650,
    quantidade: 2,
    destaque: true,
    categoriaId: categoriaIds.kits,
    fornecedorId: balaoRef.id,
  });

  // cliente
  const clienteRef = adminDb.collection(COLECOES.clientes).doc();
  await clienteRef.set({
    nome: "Camila Andrade",
    telefone: "11 99812-3344",
    documento: "378.221.110-04",
    criadoEm: Timestamp.now(),
  });

  // contrato de exemplo (presencial) com parcelas pelo Modelo C
  const inicio = new Date("2026-07-04");
  const fim = new Date("2026-07-05");
  const total = 280 + 120 * 2 + 150; // arco + 2 mesas + trono
  const parcelas = gerarParcelas(total, inicio.toISOString(), fim.toISOString());

  const numeroRef = adminDb.collection(COLECOES.contadores).doc("contratos");
  await numeroRef.set({ ultimo: 1 }, { merge: true });

  await adminDb.collection(COLECOES.contratos).add({
    numero: 1,
    clienteId: clienteRef.id,
    evento: "Aniversário 1 ano Helena",
    inicio: Timestamp.fromDate(inicio),
    fim: Timestamp.fromDate(fim),
    status: "CONFIRMADO",
    tipoServico: "PRESENCIAL",
    custos: 140,
    executoraId: michele,
    modoLogistica: "ENTREGA",
    endereco: "Rua das Acácias, 120 - Guararema",
    saidaEntregue: false,
    itensDevolvidos: false,
    itens: [
      { produtoId: arcoId, quantidade: 1, precoUnitario: 280 },
      { produtoId: mesaId, quantidade: 2, precoUnitario: 120 },
      { produtoId: tronoId, quantidade: 1, precoUnitario: 150 },
    ],
    parcelas: parcelas.map((p) => ({
      rotulo: p.rotulo,
      vencimento: Timestamp.fromDate(new Date(p.vencimento)),
      valor: p.valor,
      pago: p.pago,
    })),
    criadoEm: Timestamp.now(),
  });

  console.log(`Seed concluído. Login admin: maiele@rhema.com / senha: ${SENHA_PADRAO}`);
  console.log(`uid admin: ${maiele}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
