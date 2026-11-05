const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const express = require('express');
const nodemailer = require('nodemailer');
const { put: putBlob, get: getBlob } = require('@vercel/blob');

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));

const blobClientTokenHandler = require('./lib/blob-client-token-handler');
const {
  checkHealth,
  countAdminUsers,
  createSignatureToken,
  deleteContract,
  deleteImportedContractTemplate,
  getAppSetting,
  deleteUserById,
  getContractBySignatureToken,
  getContract,
  getImportedContractTemplate,
  getPdfTemplate,
  listContracts,
  listImportedContractTemplates,
  listUsers,
  listPdfTemplates,
  saveAppSetting,
  saveContract,
  saveContractBySignatureToken,
  saveImportedContractTemplate,
  savePdfTemplate,
  getTemplateMapping,
  saveTemplateMapping,
  syncManagedUserRecord,
  updateContractOwner,
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
const SERVER_ATTACHMENT_RELAY_LIMIT_BYTES = 4 * 1024 * 1024;
const JSON_BODY_LIMIT = '25mb';

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

function shouldSkipUpstreamHeader(name) {
  return AUTH_PROXY_REQUEST_SKIP_HEADERS.has(name)
    || name.startsWith('x-forwarded-')
    || name.startsWith('x-vercel-')
    || name === 'forwarded'
    || name === 'x-real-ip';
}

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
    if (typeof value === 'string' && !shouldSkipUpstreamHeader(name.toLowerCase())) {
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

function readBooleanEnv(name, fallback = false) {
  const normalized = String(process.env[name] || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function normalizeMailSettings(rawValue = {}) {
  const raw = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) ? rawValue : {};
  return {
    host: String(raw.host || '').trim(),
    port: Number(raw.port) || 587,
    user: String(raw.user || '').trim(),
    pass: String(raw.pass || '').trim(),
    from: String(raw.from || '').trim(),
    secure: raw.secure === undefined ? null : Boolean(raw.secure),
    ignoreTls: Boolean(raw.ignoreTls),
    requireTls: Boolean(raw.requireTls),
    tlsRejectUnauthorized: raw.tlsRejectUnauthorized === undefined ? true : Boolean(raw.tlsRejectUnauthorized),
  };
}

async function getStoredMailSettings() {
  try {
    const row = await getAppSetting({ key: 'smtp_config' });
    return normalizeMailSettings(row?.value || {});
  } catch (error) {
    if (String(error?.message || '').includes('Database non configurato')) {
      return normalizeMailSettings({});
    }
    throw error;
  }
}

function buildMailSettingsResponse(settings) {
  const normalized = normalizeMailSettings(settings);
  return {
    host: normalized.host,
    port: normalized.port,
    user: normalized.user,
    from: normalized.from,
    secure: normalized.secure === null ? normalized.port === 465 : normalized.secure,
    ignoreTls: normalized.ignoreTls,
    requireTls: normalized.requireTls,
    tlsRejectUnauthorized: normalized.tlsRejectUnauthorized,
    hasPassword: Boolean(normalized.pass),
  };
}

async function getMailTransportConfig() {
  const stored = await getStoredMailSettings();
  const host = stored.host || String(process.env.SMTP_HOST || '').trim();
  const port = stored.port || Number(process.env.SMTP_PORT) || 587;
  const user = stored.user || String(process.env.SMTP_USER || '').trim();
  const pass = stored.pass || String(process.env.SMTP_PASS || '').trim();
  const from = stored.from || String(process.env.SMTP_FROM || user || '').trim();

  if (!host) {
    throw new Error('SMTP_HOST non configurato.');
  }
  if (user && !pass) {
    throw new Error('SMTP_PASS non configurato.');
  }
  if (!from) {
    throw new Error('SMTP_FROM non configurato.');
  }

  const transport = {
    host,
    port,
    secure: stored.secure === null ? readBooleanEnv('SMTP_SECURE', port === 465) : stored.secure,
  };

  if (user) {
    transport.auth = { user, pass };
  }
  const ignoreTls = stored.ignoreTls || readBooleanEnv('SMTP_IGNORE_TLS', false);
  const requireTls = stored.requireTls || readBooleanEnv('SMTP_REQUIRE_TLS', false);
  const tlsRejectUnauthorized = stored.pass || stored.host || stored.user || stored.from
    ? stored.tlsRejectUnauthorized
    : readBooleanEnv('SMTP_TLS_REJECT_UNAUTHORIZED', true);
  if (ignoreTls) {
    transport.ignoreTLS = true;
  }
  if (requireTls) {
    transport.requireTLS = true;
  }
  if (!tlsRejectUnauthorized) {
    transport.tls = { rejectUnauthorized: false };
  }

  return { transport, from };
}

async function streamToBuffer(stream) {
  const nodeStream = typeof stream?.pipe === 'function'
    ? stream
    : stream
      ? Readable.fromWeb(stream)
      : null;
  if (!nodeStream) {
    return Buffer.from([]);
  }

  const chunks = [];
  for await (const chunk of nodeStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function downloadPrivateBlobAttachment(pathname, requestedName = '', fallbackContentType = 'application/octet-stream') {
  const normalizedPathname = String(pathname || '').trim();
  const config = blobClientTokenHandler.resolveUploadConfig(normalizedPathname);
  if (!config || !normalizedPathname.toLowerCase().startsWith('contract-documents/')) {
    throw new Error('Percorso allegato non consentito.');
  }

  const { blobToken, blobStoreId } = blobClientTokenHandler.getBlobServerConfig();
  const getOptions = {
    access: 'private',
    token: blobToken,
  };
  if (blobStoreId) {
    getOptions.storeId = blobStoreId;
  }

  const result = await getBlob(normalizedPathname, getOptions);
  const content = await streamToBuffer(result.stream);
  return {
    filename: String(requestedName || path.basename(normalizedPathname) || 'allegato').trim(),
    content,
    contentType: result.blob?.contentType || fallbackContentType,
  };
}

const app = express();

app.use(NEON_AUTH_PROXY_PATH, express.raw({ type: '*/*', limit: '2mb' }), handleAuthProxy);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.post('/api/blob-client-token', async (req, res) => {
  const pathname = String(req.body?.pathname || '');
  const user = pathname.startsWith('imported-contracts/')
    ? await requireAdmin(req, res)
    : await requireAuth(req, res);
  if (!user) {
    return;
  }
  await blobClientTokenHandler(req, res);
});

app.get('/api/blob-file', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  try {
    const pathname = String(req.query.pathname || '');
    const requestedName = String(req.query.fileName || '').trim();
    const config = blobClientTokenHandler.resolveUploadConfig(pathname);
    if (!config) {
      throw new Error('Percorso file non consentito.');
    }

    const { blobToken, blobStoreId } = blobClientTokenHandler.getBlobServerConfig();
    const getOptions = {
      access: 'private',
      token: blobToken,
    };
    if (blobStoreId) {
      getOptions.storeId = blobStoreId;
    }

    const result = await getBlob(pathname, getOptions);
    const downloadName = requestedName || path.basename(pathname) || 'file';

    res.setHeader('Content-Type', result.blob?.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${downloadName.replace(/"/g, '')}"`);

    const outputStream = typeof result.stream?.pipe === 'function'
      ? result.stream
      : Readable.fromWeb(result.stream);
    outputStream.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || 'Errore lettura file.' });
      } else {
        res.destroy(error);
      }
    });
    outputStream.pipe(res);
  } catch (error) {
    const message = error?.message || 'Errore recupero file.';
    const statusCode = message.toLowerCase().includes('not found')
      ? 404
      : message.includes('non consentito')
        ? 400
        : message.includes('non configurato')
          ? 503
          : 500;
    res.status(statusCode).json({ error: message });
  }
});

app.post('/api/contract-attachments/upload', express.raw({ type: '*/*', limit: '4mb' }), async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  try {
    const pathname = String(req.query.pathname || '');
    const config = blobClientTokenHandler.resolveUploadConfig(pathname);
    if (!config || !pathname.toLowerCase().startsWith('contract-documents/')) {
      throw new Error('Percorso upload allegato non consentito.');
    }

    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    if (!bytes.length) {
      throw new Error('File allegato mancante.');
    }

    const maxSizeInBytes = Math.min(Number(config.maximumSizeInBytes) || SERVER_ATTACHMENT_RELAY_LIMIT_BYTES, SERVER_ATTACHMENT_RELAY_LIMIT_BYTES);
    if (bytes.length > maxSizeInBytes) {
      throw new Error('File troppo grande per il caricamento tramite server.');
    }

    const contentType = String(req.header('content-type') || 'application/octet-stream');
    const originalName = String(req.query.fileName || '');
    const { blobToken, blobStoreId } = blobClientTokenHandler.getBlobServerConfig();
    const putOptions = {
      access: 'private',
      addRandomSuffix: false,
      contentType,
      token: blobToken,
    };
    if (blobStoreId) {
      putOptions.storeId = blobStoreId;
    }

    const blob = await putBlob(pathname, bytes, putOptions);

    res.json({
      name: originalName,
      url: blob.url,
      downloadUrl: `/api/blob-file?pathname=${encodeURIComponent(blob.pathname || pathname)}&fileName=${encodeURIComponent(originalName || path.basename(blob.pathname || pathname))}`,
      pathname: blob.pathname || pathname,
      size: Number(blob.size) || bytes.length,
      contentType: blob.contentType || contentType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error?.message || 'Errore caricamento allegato.';
    const statusCode = message.includes('non consentito')
      ? 400
      : message.includes('troppo grande')
        ? 413
        : message.includes('mancante')
          ? 400
          : message.includes('non configurato')
            ? 503
            : 500;
    res.status(statusCode).json({ error: message });
  }
});

app.post('/api/contracts/send-email', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  try {
    const to = String(req.body?.to || '').trim().toLowerCase();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    const contractFileName = String(req.body?.contractFileName || 'contratto.pdf').trim() || 'contratto.pdf';
    const contractPdfBase64 = String(req.body?.contractPdfBase64 || '').trim();
    const requestedAttachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];

    if (!to || !subject || !message || !contractPdfBase64) {
      res.status(400).json({ error: 'Destinatario, oggetto, messaggio e PDF del contratto sono obbligatori.' });
      return;
    }

    const contractContent = Buffer.from(contractPdfBase64, 'base64');
    if (!contractContent.length) {
      res.status(400).json({ error: 'PDF del contratto non valido.' });
      return;
    }

    const mailConfig = await getMailTransportConfig();
    const transporter = nodemailer.createTransport(mailConfig.transport);
    const attachments = [
      {
        filename: contractFileName.replace(/"/g, '') || 'contratto.pdf',
        content: contractContent,
        contentType: 'application/pdf',
      },
    ];

    for (const item of requestedAttachments) {
      const pathname = String(item?.pathname || '').trim();
      if (!pathname) {
        continue;
      }
      attachments.push(await downloadPrivateBlobAttachment(
        pathname,
        String(item?.fileName || '').trim(),
        String(item?.contentType || '').trim() || 'application/octet-stream',
      ));
    }

    await transporter.sendMail({
      from: mailConfig.from,
      to,
      subject,
      text: message,
      attachments,
    });

    res.json({
      ok: true,
      attachmentsCount: attachments.length,
      recipient: to,
    });
  } catch (error) {
    const message = error?.message || 'Errore invio e-mail.';
    const statusCode = message.includes('non configurato')
      ? 503
      : message.includes('non consentito')
        ? 400
        : 500;
    res.status(statusCode).json({ error: message });
  }
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

app.get('/api/admin/email-settings', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }

  try {
    const settings = await getStoredMailSettings();
    res.json({ item: buildMailSettingsResponse(settings) });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Errore caricamento impostazioni e-mail.' });
  }
});

app.post('/api/admin/email-settings', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }

  try {
    const existing = await getStoredMailSettings();
    const normalized = normalizeMailSettings({
      host: req.body?.host,
      port: req.body?.port,
      user: req.body?.user,
      pass: String(req.body?.pass || '').trim() ? req.body?.pass : existing.pass,
      from: req.body?.from,
      secure: req.body?.secure,
      ignoreTls: req.body?.ignoreTls,
      requireTls: req.body?.requireTls,
      tlsRejectUnauthorized: req.body?.tlsRejectUnauthorized,
    });

    if (!normalized.host) {
      throw new Error('Host SMTP obbligatorio.');
    }
    if (!normalized.from) {
      throw new Error('Email mittente obbligatoria.');
    }
    if (normalized.user && !normalized.pass) {
      throw new Error('Password SMTP obbligatoria quando specifichi un utente.');
    }

    const saved = await saveAppSetting({
      key: 'smtp_config',
      value: normalized,
    });
    res.json({ item: buildMailSettingsResponse(saved?.value || normalized) });
  } catch (error) {
    const message = error?.message || 'Errore salvataggio impostazioni e-mail.';
    const statusCode = message.includes('obbligatoria') || message.includes('obbligatorio') ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
});

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

app.patch('/api/contracts/:id/owner', async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }
  try {
    const existing = await getContract({ id: req.params.id, isAdmin: true });
    if (!existing) {
      res.status(404).json({ error: 'Contratto non trovato' });
      return;
    }

    const ownerUserId = String(req.body?.ownerUserId || '').trim();
    if (!ownerUserId) {
      res.status(400).json({ error: 'ownerUserId è richiesto.' });
      return;
    }

    const targetUser = await getUserById(ownerUserId);
    if (!targetUser) {
      res.status(404).json({ error: 'Utente di destinazione non trovato.' });
      return;
    }

    const item = await updateContractOwner({ id: existing.id, ownerUserId });
    res.json({ item });
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
