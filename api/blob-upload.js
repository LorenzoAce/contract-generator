const { handleUpload } = require('@vercel/blob/client');
const MAX_IMPORTED_CONTRACT_SIZE_BYTES = 100 * 1024 * 1024;

// #region debug-point C:blob-server-report
function reportBlobRouteDebug(hypothesisId, msg, data) {
  if (typeof fetch !== 'function') {
    return;
  }
  fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'upload-stall',
      runId: 'pre-fix',
      hypothesisId,
      location: 'api/blob-upload.js',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  const blobToken = sanitizeEnv(process.env.BLOB_READ_WRITE_TOKEN);
  const blobStoreId = sanitizeEnv(process.env.BLOB_STORE_ID);

  if (!blobToken) {
    res.status(503).json({ error: 'Vercel Blob non configurato. Imposta BLOB_READ_WRITE_TOKEN.' });
    return;
  }

  try {
    const requestBody = getRequestJsonBody(req);
    // #region debug-point C:blob-server-entry
    reportBlobRouteDebug('C', 'blob route entry', {
      bodyType: sanitizeEnv(requestBody?.type || ''),
      hasPayload: Boolean(requestBody?.payload),
      hasClientPayload: Boolean(requestBody?.payload?.clientPayload),
      blobStoreId: blobStoreId || '',
    });
    // #endregion
    const jsonResponse = await handleUpload({
      token: blobToken,
      body: requestBody,
      request: toWebRequest(req),
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        if (!isAllowedPath(pathname)) {
          throw new Error('Percorso upload non consentito.');
        }

        const payload = parseClientPayload(clientPayload);
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: MAX_IMPORTED_CONTRACT_SIZE_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            pathname,
            multipart: Boolean(multipart),
            contractType: payload.contractType || '',
            templateHash: payload.templateHash || '',
            templateName: payload.templateName || '',
            blobStoreId,
          }),
        };
      },
    });

    // #region debug-point B:blob-server-success
    reportBlobRouteDebug('B', 'blob route success', {
      responseType: sanitizeEnv(jsonResponse?.type || ''),
      responseKeys: Object.keys(jsonResponse || {}),
    });
    // #endregion
    res.status(200).json(jsonResponse);
  } catch (error) {
    // #region debug-point E:blob-server-error
    reportBlobRouteDebug('E', 'blob route error', {
      message: sanitizeEnv(error?.message || ''),
      name: sanitizeEnv(error?.name || ''),
    });
    // #endregion
    const statusCode = String(error?.message || '').includes('non consentito') ? 400 : 500;
    res.status(statusCode).json({ error: error?.message || 'Errore upload Blob.' });
  }
};

function isAllowedPath(pathname) {
  return typeof pathname === 'string'
    && pathname.startsWith('imported-contracts/')
    && pathname.toLowerCase().endsWith('.pdf');
}

function sanitizeEnv(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getRequestJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString('utf8'));
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  throw new Error('Payload upload Blob non valido.');
}

function parseClientPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(rawPayload);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function toWebRequest(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost';
  const headers = new Headers();

  Object.entries(req.headers || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, String(item)));
      return;
    }
    if (value != null) {
      headers.set(key, String(value));
    }
  });

  const init = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && typeof req.body !== 'undefined') {
    init.body = JSON.stringify(req.body);
  }

  return new Request(`${protocol}://${host}${req.url}`, init);
}
