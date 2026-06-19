const { handleUpload } = require('@vercel/blob/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ error: 'Vercel Blob non configurato. Imposta BLOB_READ_WRITE_TOKEN.' });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: toWebRequest(req),
      onBeforeGenerateToken: async (pathname) => {
        if (!isAllowedPath(pathname)) {
          throw new Error('Percorso upload non consentito.');
        }

        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {},
    });

    res.status(200).json(jsonResponse);
  } catch (error) {
    const statusCode = String(error?.message || '').includes('non consentito') ? 400 : 500;
    res.status(statusCode).json({ error: error?.message || 'Errore upload Blob.' });
  }
};

function isAllowedPath(pathname) {
  return typeof pathname === 'string'
    && pathname.startsWith('imported-contracts/')
    && pathname.toLowerCase().endsWith('.pdf');
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
