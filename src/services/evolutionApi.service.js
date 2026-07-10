// Cliente HTTP fino pro Evolution API. Usa o fetch nativo do Node 18+,
// então não precisa de nenhuma dependência extra.

async function enviarTexto({ evolutionApiUrl, instancia, tokenAcesso }, telefoneDestino, texto) {
  const url = `${evolutionApiUrl}/message/sendText/${instancia}`;

  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: tokenAcesso,
    },
    body: JSON.stringify({ number: telefoneDestino, text: texto }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    throw new Error(`Evolution API respondeu ${resposta.status} ao enviar mensagem: ${corpo}`);
  }

  return resposta.json();
}

module.exports = { enviarTexto };
