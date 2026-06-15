const {
  getTemplateMapping,
  saveTemplateMapping,
} = require('../lib/template-mapping-service');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const row = await getTemplateMapping({
        templateHash: req.query.templateHash,
        contractType: req.query.contractType,
      });
      if (!row) {
        res.status(404).json({ error: 'Mapping non trovato' });
        return;
      }
      res.status(200).json(row);
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore database' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = await getJsonBody(req);
      const row = await saveTemplateMapping(body);
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
  if (message === 'templateHash richiesto' || message.includes('sono richiesti')) {
    return 400;
  }
  if (message.includes('Database non configurato')) {
    return 503;
  }
  return 500;
}

async function getJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}
