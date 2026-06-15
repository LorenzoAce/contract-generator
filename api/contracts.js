const { listContracts, saveContract } = require('../lib/template-mapping-service');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const rows = await listContracts({ contractType: req.query.contractType });
      res.status(200).json({ items: rows });
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore database' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = await getJsonBody(req);
      const row = await saveContract({
        id: body.id,
        contractType: body.contractType,
        name: body.name,
        payload: body.payload,
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

