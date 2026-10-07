// Service worker mínimo para o app ser instalável. Não guarda nada em cache de
// propósito: é um sistema com login e dados financeiros, e tudo deve vir sempre
// atualizado do servidor (nada de dados de clientes salvos no aparelho).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // sem respondWith: o navegador busca normalmente na rede
});
