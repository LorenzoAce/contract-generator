const { listPdfTemplates, savePdfTemplate } = require('../lib/template-mapping-service');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const items = await listPdfTemplates({ contractType: req.query.contractType });
      res.status(200).json({ items });
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore database' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const templateHash = (req.query.templateHash || req.headers['x-template-hash'] || '').toString();
      const contractType = (req.query.contractType || '').toString();
      const templateName = (req.query.templateName || '').toString();
      const contentType = (req.headers['content-type'] || 'application/pdf').toString();
      const bytes = await getRawBodyBuffer(req);

      const row = await savePdfTemplate({
        templateHash,
        contractType,
        templateName,
        contentType,
        bytes,
      });
      res.status(200).json(row);
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore database' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Metodo non consentito' });
};

function resolveStatusCode(error) {
  const message = String(error && error.message ? error.message : '');
  if (message.includes('sono richiesti') || message.endsWith('richiesto')) {
    return 400;
  }
  if (message.includes('Database non configurato')) {
    return 503;
  }
  return 500;
}

async function getRawBodyBuffer(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (req.body instanceof Uint8Array) {
    return Buffer.from(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

