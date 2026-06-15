const path = require('path');
const express = require('express');
const {
  checkHealth,
  getTemplateMapping,
  saveTemplateMapping,
} = require('./lib/template-mapping-service');

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    res.json(await checkHealth());
  } catch (error) {
    res.status(500).json({ ok: false, dbConfigured: true, error: error.message || 'Database error' });
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
  try {
    res.json(await saveTemplateMapping(req.body || {}));
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.use(express.static(path.join(__dirname), { dotfiles: 'ignore', index: 'index.html' }));

app.listen(PORT, () => {
  process.stdout.write(`Server avviato su http://localhost:${PORT}\n`);
});

