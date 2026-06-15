const { checkHealth } = require('../lib/template-mapping-service');

module.exports = async function handler(_req, res) {
  try {
    res.status(200).json(await checkHealth());
  } catch (error) {
    res.status(500).json({
      ok: false,
      dbConfigured: true,
      error: error.message || 'Database error',
    });
  }
};
