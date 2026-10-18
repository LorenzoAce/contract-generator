const {
  listUsers,
  syncManagedUserRecord,
} = require('../lib/template-mapping-service');
const { requireAdmin } = require('../lib/request-auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const user = await requireAdmin(req, res);
    if (!user) {
      return;
    }
    try {
      res.status(200).json({ items: await listUsers() });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Errore caricamento utenti' });
    }
    return;
  }

  if (req.method === 'POST') {
    const user = await requireAdmin(req, res);
    if (!user) {
      return;
    }
    try {
      const body = await getJsonBody(req);
      const id = String(body?.id || '').trim();
      const email = String(body?.email || '').trim().toLowerCase();
      const fullName = String(body?.fullName || '').trim();
      const role = String(body?.role || 'user').trim().toLowerCase() === 'admin' ? 'admin' : 'user';
      const isActive = typeof body?.isActive === 'boolean' ? body.isActive : true;

      if (!id || !email || !fullName) {
        res.status(400).json({ error: 'ID, nome completo ed email sono obbligatori.' });
        return;
      }

      const item = await syncManagedUserRecord({
        id,
        email,
        fullName,
        role,
        isActive,
      });

      res.status(201).json({ item });
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore creazione utente' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Metodo non consentito' });
};

function resolveStatusCode(error) {
  const message = String(error && error.message ? error.message : '');
  if (message.includes('sono obbligatori') || message.includes('sono richiesti') || message.endsWith('richiesto')) {
    return 400;
  }
  if (message.includes('Permessi amministratore richiesti')) {
    return 403;
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
