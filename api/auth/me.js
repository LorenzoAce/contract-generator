const { resolveRequestUser } = require('../../lib/request-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sessione non valida.' });
      return;
    }
    res.status(200).json({ user });
  } catch (error) {
    const statusCode = String(error?.message || '').includes('Neon Auth non configurato') ? 503 : 401;
    res.status(statusCode).json({ error: error.message || 'Errore sessione' });
  }
};
