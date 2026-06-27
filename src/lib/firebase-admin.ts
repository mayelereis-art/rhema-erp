import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Em produção (Firebase App Hosting), as credenciais vêm automaticamente do
// ambiente — não é preciso FIREBASE_SERVICE_ACCOUNT_KEY. Em dev local, defina
// essa variável com o JSON da service account (veja .env.example).
function criarApp(): App {
  if (getApps().length) return getApps()[0];

  // Emuladores locais (`firebase emulators:start`) não usam credencial real,
  // só precisam de um projectId para o Admin SDK não tentar resolver ADC.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-rhema" });
  }

  const chaveServico = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (chaveServico) {
    return initializeApp({
      credential: cert(JSON.parse(chaveServico)),
    });
  }

  return initializeApp();
}

const adminApp = criarApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
