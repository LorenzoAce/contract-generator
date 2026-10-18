const {
  countAdminUsers,
  deleteUserById,
  getUserById,
  updateManagedUserRecord,
} = require('../../lib/template-mapping-service');
const { requireAdmin } = require('../../lib/request-auth');

module.exports = async function handler(req, res) {
  const id = req.query.id;

  if (req.method === 'PATCH') {
    const user = await requireAdmin(req, res);
    if (!user) {
      return;
    }

    try {
      const target = await getUserById(id);
      if (!target) {
        res.status(404).json({ error: 'Utente non trovato.' });
        return;
      }

      const body = await getJsonBody(req);
      const nextFullName = String(body?.fullName || '').trim() || target.full_name;
      const nextRole = String(body?.role || target.role).trim().toLowerCase() === 'admin' ? 'admin' : 'user';
      const nextIsActive = typeof body?.isActive === 'boolean' ? body.isActive : target.is_active;
      const activeAdmins = await countAdminUsers();

      if (target.id === user.id && (!nextIsActive || nextRole !== 'admin')) {
        res.status(400).json({ error: 'Non puoi rimuovere i tuoi permessi admin o disattivare il tuo account.' });
        return;
      }

      if (target.role === 'admin' && activeAdmins <= 1 && (!nextIsActive || nextRole !== 'admin')) {
        res.status(400).json({ error: 'Deve restare almeno un admin attivo.' });
        return;
      }

      const item = await updateManagedUserRecord({
        id: target.id,
        fullName: nextFullName,
        role: nextRole,
        isActive: nextIsActive,
      });

      res.status(200).json({ item });
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore aggiornamento utente' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const user = await requireAdmin(req, res);
    if (!user) {
      return;
    }

    try {
      const target = await getUserById(id);
      if (!target) {
        res.status(404).json({ error: 'Utente non trovato.' });
        return;
      }

      const activeAdmins = await countAdminUsers();
      if (target.id === user.id) {
        res.status(400).json({ error: 'Non puoi eliminare il tuo account admin.' });
        return;
      }
      if (target.role === 'admin' && activeAdmins <= 1) {
        res.status(400).json({ error: 'Deve restare almeno un admin attivo.' });
        return;
      }

      await deleteUserById({ id: target.id });
      res.status(204).end();
    } catch (error) {
      res.status(resolveStatusCode(error)).json({ error: error.message || 'Errore eliminazione utente' });
    }
    return;
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  res.status(405).json({ error: 'Metodo non consentito' });
};

function resolveStatusCode(error) {
  const message = String(error && error.message ? error.message : '');
  if (message.includes('Utente non trovato')) {
    return 404;
  }
  if (message.includes('Deve restare almeno un admin attivo') || message.includes('Non puoi')) {
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
