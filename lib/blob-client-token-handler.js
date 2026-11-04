const { generateClientTokenFromReadWriteToken } = require('@vercel/blob/client');

const MAX_IMPORTED_CONTRACT_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_CONTRACT_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
const CONTRACT_ATTACHMENT_CONTENT_TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

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
  if (!blobStoreId) {
    res.status(503).json({ error: 'Vercel Blob non configurato. Imposta anche BLOB_STORE_ID.' });
    return;
  }

  try {
    const requestBody = getRequestJsonBody(req);
    const pathname = sanitizeEnv(requestBody?.pathname);
    const config = resolveUploadConfig(pathname);
    if (!config) {
      throw new Error('Percorso upload non consentito.');
    }

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: blobToken,
      storeId: blobStoreId,
      pathname,
      allowedContentTypes: config.allowedContentTypes,
      maximumSizeInBytes: config.maximumSizeInBytes,
      addRandomSuffix: config.addRandomSuffix,
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

function resolveUploadConfig(pathname) {
  const lower = String(pathname || '').toLowerCase();

  if (lower.startsWith('imported-contracts/') && lower.endsWith('.pdf')) {
    return {
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: MAX_IMPORTED_CONTRACT_SIZE_BYTES,
      addRandomSuffix: false,
    };
  }

  if (lower.startsWith('contract-documents/')) {
    const extension = lower.includes('.') ? lower.split('.').pop() : '';
    const contentType = CONTRACT_ATTACHMENT_CONTENT_TYPES[extension];
    if (contentType) {
      return {
        allowedContentTypes: [contentType],
        maximumSizeInBytes: MAX_CONTRACT_ATTACHMENT_SIZE_BYTES,
        addRandomSuffix: false,
      };
    }
  }

  return null;
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
