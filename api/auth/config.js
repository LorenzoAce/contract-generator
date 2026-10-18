const { getAuthBaseUrl } = require('../../lib/request-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  res.status(200).json({
    configured: Boolean(getAuthBaseUrl()),
    baseUrl: getAuthBaseUrl(),
  });
};
