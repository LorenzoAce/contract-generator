const { getBootstrapStatus } = require('../../lib/request-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  try {
    res.status(200).json(await getBootstrapStatus());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore bootstrap status' });
  }
};
