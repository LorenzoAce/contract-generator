const fs = require('fs');
const path = require('path');
const express = require('express');

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));

const blobClientTokenHandler = require('./lib/blob-client-token-handler');
const {
  checkHealth,
  countAdminUsers,
  createSignatureToken,
  deleteContract,
  deleteImportedContractTemplate,
  deleteUserById,
  getContractBySignatureToken,
  getContract,
  getImportedContractTemplate,
  getPdfTemplate,
  listContracts,
  listImportedContractTemplates,
  listUsers,
  listPdfTemplates,
  saveContract,
  saveContractBySignatureToken,
  saveImportedContractTemplate,
  savePdfTemplate,
  getTemplateMapping,
  saveTemplateMapping,
  syncManagedUserRecord,
  updateManagedUserRecord,
  getUserById,
} = require('./lib/template-mapping-service');
const {
  getAuthBaseUrl,
  getBootstrapStatus,
  requireAdmin,
  requireAuth,
  resolveRequestUser,
} = require('./lib/request-auth');

const PORT = Number(process.env.PORT) || 3000;

const NEON_AUTH_PROXY_PATH = '/api/auth-proxy';

const AUTH_PROXY_REQUEST_SKIP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
]);

const AUTH_PROXY_RESPONSE_SKIP_HEADERS = new Set([
  'set-cookie',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

function rewriteAuthProxyCookie(cookieHeader) {
  const parts = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !/^domain\s*=/i.test(part) && !/^path\s*=/i.test(part) && !/^partitioned$/i.test(part));
  parts.push(`Path=${NEON_AUTH_PROXY_PATH}`);
  return parts.join('; ');
}

async function handleAuthProxy(req, res) {
  const authBaseUrl = getAuthBaseUrl();
  if (!authBaseUrl) {
    res.status(503).json({ error: 'Neon Auth non configurato. Imposta NEON_AUTH_BASE_URL.' });
    return;
  }

  const upstreamPath = (req.originalUrl || '').slice(NEON_AUTH_PROXY_PATH.length) || '/';
  const upstreamUrl = `${authBaseUrl.replace(/\/+$/, '')}${upstreamPath}`;

  const headers = new Headers();
  Object.entries(req.headers).forEach(([name, value]) => {
    if (typeof value === 'string' && !AUTH_PROXY_REQUEST_SKIP_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  });

  const method = (req.method || 'GET').toUpperCase();
  const body = ['GET', 'HEAD'].includes(method) || !req.body?.length ? undefined : req.body;

  try {
    const upstream = await fetch(upstreamUrl, { method, headers, body, redirect: 'manual' });

    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (!AUTH_PROXY_RESPONSE_SKIP_HEADERS.has(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    const setCookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
    if (setCookies.length) {
      res.setHeader('Set-Cookie', setCookies.map(rewriteAuthProxyCookie));
    }

    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    res.status(502).json({ error: error.message || 'Errore proxy Neon Auth.' });
  }
}

const app = express();

app.use(NEON_AUTH_PROXY_PATH, express.raw({ type: '*/*', limit: '2mb' }), handleAuthProxy);

app.use(express.json({ limit: '2mb' }));

app.post('/api/blob-client-token', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  await blobClientTokenHandler(req, res);
});

app.get('/api/health', async (_req, res) => {
  try {
    res.json(await checkHealth());
  } catch (error) {
    res.status(500).json({ ok: false, dbConfigured: true, error: error.message || 'Database error' });
  }
});

async function handleBootstrapStatus(_req, res) {
  try {
    res.json(await getBootstrapStatus());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore bootstrap status' });
  }
}

function handleAuthConfig(_req, res) {
  res.json({
    configured: Boolean(getAuthBaseUrl()),
    baseUrl: NEON_AUTH_PROXY_PATH,
  });
}

async function handleAuthMe(req, res) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sessione non valida.' });
      return;
    }
    res.json({ user });
  } catch (error) {
    const statusCode = String(error?.message || '').includes('Neon Auth non configurato') ? 503 : 401;
    res.status(statusCode).json({ error: error.message || 'Errore sessione' });
  }
}

app.get('/api/auth/bootstrap-status', handleBootstrapStatus);
app.get('/api/bootstrap-status', handleBootstrapStatus);

app.get('/api/auth/config', handleAuthConfig);
app.get('/api/auth-config', handleAuthConfig);

app.get('/api/auth/me', handleAuthMe);
app.get('/api/me', handleAuthMe);

app.get('/api/users', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  try {
    res.json({ items: await listUsers() });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento utenti' });
  }
});

app.post('/api/users', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  try {
    const id = String(req.body?.id || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const fullName = String(req.body?.fullName || '').trim();
    const role = String(req.body?.role || 'user').trim().toLowerCase() === 'admin' ? 'admin' : 'user';
    const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : true;

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
    res.status(error.statusCode || 500).json({ error: error.message || 'Errore creazione utente' });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }

  try {
    const target = await getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Utente non trovato.' });
      return;
    }

    const nextFullName = String(req.body?.fullName || '').trim() || target.full_name;
    const nextRole = String(req.body?.role || target.role).trim().toLowerCase() === 'admin' ? 'admin' : 'user';
    const nextIsActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : target.is_active;
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

    res.json({ item });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Errore aggiornamento utente' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }

  try {
    const target = await getUserById(req.params.id);
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
    res.status(error.statusCode || 500).json({ error: error.message || 'Errore eliminazione utente' });
  }
});

app.get('/api/template-mappings', async (req, res) => {
  try {
    const row = await getTemplateMapping({
      templateHash: req.query.templateHash,
      contractType: req.query.contractType,
    });
    if (!row) {
      res.status(404).json({ error: 'Mapping non trovato' });
      return;
    }
    res.json(row);
  } catch (error) {
    const statusCode = error.message === 'templateHash richiesto' ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/template-mappings', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  try {
    res.json(await saveTemplateMapping(req.body || {}));
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const items = await listPdfTemplates({ contractType: req.query.contractType });
    res.json({ items });
  } catch (error) {
    const statusCode = error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/templates', express.raw({ type: '*/*', limit: '25mb' }), async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  try {
    const templateHash = (req.query.templateHash || req.header('x-template-hash') || '').toString();
    const contractType = (req.query.contractType || '').toString();
    const templateName = (req.query.templateName || '').toString();
    const contentType = (req.header('content-type') || 'application/pdf').toString();
    const bytes = req.body;

    const row = await savePdfTemplate({
      templateHash,
      contractType,
      templateName,
      contentType,
      bytes,
    });
    res.json(row);
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/templates/:hash', async (req, res) => {
  try {
    const row = await getPdfTemplate({ templateHash: req.params.hash });
    if (!row) {
      res.status(404).json({ error: 'Template non trovato' });
      return;
    }
    res.setHeader('Content-Type', row.content_type || 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(row.bytes);
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/imported-contract-templates', async (req, res) => {
  try {
    const items = await listImportedContractTemplates({ contractType: req.query.contractType });
    res.json({ items });
  } catch (error) {
    const statusCode = error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/imported-contract-templates/:id', async (req, res) => {
  try {
    const row = await getImportedContractTemplate({ id: req.params.id });
    if (!row) {
      res.status(404).json({ error: 'Template importato non trovato' });
      return;
    }
    res.json(row);
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/imported-contract-templates', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  try {
    res.json(await saveImportedContractTemplate(req.body || {}));
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.delete('/api/imported-contract-templates/:id', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  try {
    await deleteImportedContractTemplate({ id: req.params.id });
    res.status(204).end();
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/contracts', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }
  try {
    const items = await listContracts({
      contractType: req.query.contractType,
      ownerUserId: user.id,
      isAdmin: user.is_admin,
    });
    res.json({ items });
  } catch (error) {
    const statusCode = error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/contracts', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }
  try {
    const existing = req.body?.id
      ? await getContract({ id: req.body.id, ownerUserId: user.id, isAdmin: user.is_admin })
      : null;
    if (req.body?.id && !existing && !user.is_admin) {
      const ownedByOther = await getContract({ id: req.body.id, isAdmin: true });
      if (ownedByOther) {
        res.status(404).json({ error: 'Contratto non trovato.' });
        return;
      }
    }
    const ownerUserId = existing?.owner_user_id || user.id;
    const row = await saveContract({ ...(req.body || {}), ownerUserId });
    res.json(row);
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/contracts/:id', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }
  try {
    const row = await getContract({ id: req.params.id, ownerUserId: user.id, isAdmin: user.is_admin });
    if (!row) {
      res.status(404).json({ error: 'Contratto non trovato' });
      return;
    }
    res.json(row);
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.put('/api/contracts/:id', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }
  try {
    const existing = await getContract({ id: req.params.id, ownerUserId: user.id, isAdmin: user.is_admin });
    if (!existing) {
      res.status(404).json({ error: 'Contratto non trovato' });
      return;
    }
    const row = await saveContract({
      ...(req.body || {}),
      id: req.params.id,
      ownerUserId: existing.owner_user_id || user.id,
    });
    res.json(row);
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.delete('/api/contracts/:id', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }
  try {
    const existing = await getContract({ id: req.params.id, ownerUserId: user.id, isAdmin: user.is_admin });
    if (!existing) {
      res.status(404).json({ error: 'Contratto non trovato' });
      return;
    }
    await deleteContract({ id: req.params.id });
    res.status(204).end();
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/contracts/:id/signature-links', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }
  try {
    const contract = await getContract({ id: req.params.id, ownerUserId: user.id, isAdmin: user.is_admin });
    if (!contract) {
      res.status(404).json({ error: 'Contratto non trovato' });
      return;
    }
    const signatureToken = await createSignatureToken({
      contractId: contract.id,
      createdByUserId: user.id,
      daysToLive: Number(req.body?.daysToLive) || 14,
    });
    res.json(signatureToken);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore creazione link firma' });
  }
});

app.get('/api/signature-links/:token', async (req, res) => {
  try {
    const row = await getContractBySignatureToken(req.params.token);
    if (!row) {
      res.status(404).json({ error: 'Link firma non valido o scaduto.' });
      return;
    }
    res.json(row);
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore link firma' });
  }
});

app.put('/api/signature-links/:token', async (req, res) => {
  try {
    const row = await saveContractBySignatureToken({
      token: req.params.token,
      name: req.body?.name,
      payload: req.body?.payload,
    });
    if (!row) {
      res.status(404).json({ error: 'Link firma non valido o scaduto.' });
      return;
    }
    res.json(row);
  } catch (error) {
    const statusCode = error.message.includes('richiesti')
      ? 400
      : error.message.includes('non valido o scaduto')
        ? 404
        : error.message.includes('Database non configurato')
          ? 503
          : 500;
    res.status(statusCode).json({ error: error.message || 'Errore aggiornamento firma' });
  }
});

app.use(express.static(path.join(__dirname), { dotfiles: 'ignore', index: 'index.html' }));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

if (require.main === module) {
  app.listen(PORT, () => {
    process.stdout.write(`Server avviato su http://localhost:${PORT}\n`);
  });
}

module.exports = app;
