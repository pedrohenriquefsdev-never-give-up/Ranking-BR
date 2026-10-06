const APP_NAME = 'Ranking BR';
const APP_VERSION = '0.2.11';

function doGet(e) {
  return jsonResponse({
    ok: true,
    projeto: APP_NAME,
    versao: APP_VERSION,
    status: 'online',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    return jsonResponse({
      ok: true,
      projeto: APP_NAME,
      acao: body.action || 'ping',
      mensagem: 'Requisição recebida com sucesso.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      projeto: APP_NAME,
      mensagem: error.message
    });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
