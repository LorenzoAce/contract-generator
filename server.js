const path = require('path');
const express = require('express');
const {
  checkHealth,
  deleteContract,
  getContract,
  getPdfTemplate,
  listContracts,
  listPdfTemplates,
  saveContract,
  savePdfTemplate,
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

app.get('/api/templates', async (req, res) => {
  try {
    const items = await listPdfTemplates({ contractType: req.query.contractType });
    res.json({ items });
  } catch (error) {
    const statusCode = error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/templates', express.raw({ type: '*/*', limit: '25mb' }), async (req, res) => {
  try {
    const templateHash = (req.query.templateHash || req.header('x-template-hash') || '').toString();
    const contractType = (req.query.contractType || '').toString();
    const templateName = (req.query.templateName || '').toString();
    const contentType = (req.header('content-type') || 'application/pdf').toString();
    const bytes = req.body;

    const row = await savePdfTemplate({
      templateHash,
      contractType,
      templateName,
      contentType,
      bytes,
    });
    res.json(row);
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/templates/:hash', async (req, res) => {
  try {
    const row = await getPdfTemplate({ templateHash: req.params.hash });
    if (!row) {
      res.status(404).json({ error: 'Template non trovato' });
      return;
    }
    res.setHeader('Content-Type', row.content_type || 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(row.bytes);
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/contracts', async (req, res) => {
  try {
    const items = await listContracts({ contractType: req.query.contractType });
    res.json({ items });
  } catch (error) {
    const statusCode = error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/contracts', async (req, res) => {
  try {
    const row = await saveContract(req.body || {});
    res.json(row);
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.get('/api/contracts/:id', async (req, res) => {
  try {
    const row = await getContract({ id: req.params.id });
    if (!row) {
      res.status(404).json({ error: 'Contratto non trovato' });
      return;
    }
    res.json(row);
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.put('/api/contracts/:id', async (req, res) => {
  try {
    const row = await saveContract({ ...(req.body || {}), id: req.params.id });
    res.json(row);
  } catch (error) {
    const statusCode = error.message.includes('sono richiesti') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.delete('/api/contracts/:id', async (req, res) => {
  try {
    await deleteContract({ id: req.params.id });
    res.status(204).end();
  } catch (error) {
    const statusCode = error.message.endsWith('richiesto') ? 400 : error.message.includes('Database non configurato') ? 503 : 500;
    res.status(statusCode).json({ error: error.message || 'Errore database' });
  }
});

app.use(express.static(path.join(__dirname), { dotfiles: 'ignore', index: 'index.html' }));

app.listen(PORT, () => {
  process.stdout.write(`Server avviato su http://localhost:${PORT}\n`);
});

