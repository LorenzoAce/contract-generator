const { getPdfTemplate } = require('../../lib/template-mapping-service');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  try {
    const row = await getPdfTemplate({ templateHash: req.query.hash });
    if (!row) {
      res.status(404).json({ error: 'Template non trovato' });
      return;
    }

    res.setHeader('Content-Type', row.content_type || 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 200;
    res.end(row.bytes);
  } catch (error) {
    const statusCode = resolveStatusCode(error);
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
};

function resolveStatusCode(error) {
  const message = String(error && error.message ? error.message : '');
  if (message.endsWith('richiesto')) {
    return 400;
  }
  if (message.includes('Database non configurato')) {
    return 503;
  }
  return 500;
}

