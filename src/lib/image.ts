// Redimensiona uma imagem no client (crop central quadrado + resize) e
// devolve como data URI base64 — usado pra avatar sem depender de Firebase
// Storage (ver docs/FIREBASE.md: Spark não habilita bucket novo sem
// vincular billing). Cabe de sobra no limite de 1MB de campo do Firestore.
export async function resizeImageToBase64(file: File, maxDim = 128, quality = 0.75): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Selecione um arquivo de imagem.');
    }

    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = maxDim;
    canvas.height = maxDim;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, maxDim, maxDim);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    // Defensivo: com maxDim=128 isso não deveria acontecer, mas evita gravar
    // algo perto do limite de 1MB do Firestore por engano.
    if (dataUrl.length > 300_000) {
        throw new Error('Imagem processada ficou grande demais. Tente outra foto.');
    }

    return dataUrl;
}
