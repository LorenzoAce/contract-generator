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

  try {
    const { blobToken, blobStoreId } = getBlobServerConfig();
    const requestBody = getRequestJsonBody(req);
    const pathname = sanitizeEnv(requestBody?.pathname);
    const config = resolveUploadConfig(pathname);
    if (!config) {
      throw new Error('Percorso upload non consentito.');
    }

    const clientTokenOptions = {
      token: blobToken,
      pathname,
      allowedContentTypes: config.allowedContentTypes,
      maximumSizeInBytes: config.maximumSizeInBytes,
      addRandomSuffix: config.addRandomSuffix,
    };
    if (blobStoreId) {
      clientTokenOptions.storeId = blobStoreId;
    }

    const clientToken = await generateClientTokenFromReadWriteToken(clientTokenOptions);

    res.status(200).json({
      clientToken,
      pathname,
      blobStoreId: blobStoreId || null,
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

function getBlobServerConfig() {
  const blobToken = sanitizeEnv(process.env.BLOB_READ_WRITE_TOKEN);
  const blobStoreId = sanitizeEnv(process.env.BLOB_STORE_ID);
  if (!blobToken) {
    throw new Error('Vercel Blob non configurato. Imposta BLOB_READ_WRITE_TOKEN.');
  }
  return { blobToken, blobStoreId };
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

module.exports.resolveUploadConfig = resolveUploadConfig;
module.exports.getBlobServerConfig = getBlobServerConfig;
