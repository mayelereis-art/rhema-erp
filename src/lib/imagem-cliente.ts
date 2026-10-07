// Utilitário de navegador (usa canvas) — importar só de componentes client.

/**
 * Fotos de celular chegam a 5–10 MB; redimensionar antes do upload deixa o
 * envio e o carregamento das páginas muito mais rápidos.
 */
export async function comprimirImagem(arquivo: File, maxLado = 1200, qualidade = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? arquivo), "image/jpeg", qualidade));
}
