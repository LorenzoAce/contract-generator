const { generateClientTokenFromReadWriteToken } = require('@vercel/blob/client');

const MAX_IMPORTED_CONTRACT_SIZE_BYTES = 100 * 1024 * 1024;

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
    const pathname = sanitizeEnv(requestBody?.pathname);
    if (!isAllowedPath(pathname)) {
      throw new Error('Percorso upload non consentito.');
    }

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: blobToken,
      pathname,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: MAX_IMPORTED_CONTRACT_SIZE_BYTES,
      addRandomSuffix: false,
    });

    res.status(200).json({
      clientToken,
      pathname,
      blobStoreId,
    });
  } catch (error) {
    const statusCode = String(error?.message || '').includes('non consentito') ? 400 : 500;
    res.status(statusCode).json({ error: error?.message || 'Errore generazione token Blob.' });
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

  throw new Error('Payload token Blob non valido.');
}
