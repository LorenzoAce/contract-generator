const { getContract, listContracts, saveContract } = require('../lib/template-mapping-service');
const { requireAuth } = require('../lib/request-auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }
    try {
      const rows = await listContracts({
        contractType: req.query.contractType,
        ownerUserId: user.id,
        isAdmin: user.is_admin,
      });
      res.status(200).json({ items: rows });
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore database' });
    }
    return;
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }
    try {
      const body = await getJsonBody(req);
      const existing = body.id
        ? await getContract({ id: body.id, ownerUserId: user.id, isAdmin: user.is_admin })
        : null;
      if (body.id && !existing && !user.is_admin) {
        res.status(404).json({ error: 'Contratto non trovato.' });
        return;
      }
      const row = await saveContract({
        id: body.id,
        contractType: body.contractType,
        name: body.name,
        payload: body.payload,
        ownerUserId: existing?.owner_user_id || user.id,
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
