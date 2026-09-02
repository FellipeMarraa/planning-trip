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

// Mesma ideia (base64 direto, sem Storage), mas pra comprovante/recibo:
// preserva a proporção (sem crop quadrado — cortar cortaria o conteúdo de um
// recibo retangular) e resolução maior (precisa dar pra ler o texto).
export async function resizeReceiptToBase64(file: File, maxDimension = 1280, quality = 0.75): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Selecione um arquivo de imagem.');
    }

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    // Defensivo: folga sob o limite de 1MB por documento do Firestore
    // (a despesa tem outros campos além do comprovante).
    if (dataUrl.length > 700_000) {
        throw new Error('Imagem processada ficou grande demais. Tente outra foto ou uma com menos detalhe.');
    }

    return dataUrl;
}
