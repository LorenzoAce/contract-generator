const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

const app = express();
app.use(express.json({ limit: '2mb' }));

let pool = null;
let schemaReady = null;

function getPool() {
  if (!DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  if (!schemaReady) {
    schemaReady = ensureSchema(pool);
  }
  return pool;
}

async function ensureSchema(poolInstance) {
  await poolInstance.query(`
    create table if not exists template_mappings (
      template_hash text primary key,
      contract_type text not null,
      template_name text not null,
      mapping jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

function normalizeText(value) {
  return String(value || '').trim();
}

app.get('/api/health', async (_req, res) => {
  const configured = Boolean(DATABASE_URL);
  if (!configured) {
    res.json({ ok: true, dbConfigured: false });
    return;
  }

  try {
    const poolInstance = getPool();
    await poolInstance.query('select 1 as ok');
    res.json({ ok: true, dbConfigured: true });
  } catch (error) {
    res.status(500).json({ ok: false, dbConfigured: true, error: error.message || 'Database error' });
  }
});

app.get('/api/template-mappings', async (req, res) => {
  const templateHash = normalizeText(req.query.templateHash);
  const contractType = normalizeText(req.query.contractType);

  if (!templateHash) {
    res.status(400).json({ error: 'templateHash richiesto' });
    return;
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    res.status(503).json({ error: 'Database non configurato. Imposta DATABASE_URL.' });
    return;
  }

  try {
    await schemaReady;
    const result = await poolInstance.query(
      `
        select template_hash, contract_type, template_name, mapping, updated_at
        from template_mappings
        where template_hash = $1
        ${contractType ? 'and contract_type = $2' : ''}
        limit 1
      `,
      contractType ? [templateHash, contractType] : [templateHash],
    );

    if (!result.rows.length) {
      res.status(404).json({ error: 'Mapping non trovato' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore database' });
  }
});

app.post('/api/template-mappings', async (req, res) => {
  const templateHash = normalizeText(req.body?.templateHash);
  const contractType = normalizeText(req.body?.contractType);
  const templateName = normalizeText(req.body?.templateName);
  const mapping = req.body?.mapping;

  if (!templateHash || !contractType || !templateName || !mapping) {
    res.status(400).json({ error: 'templateHash, contractType, templateName e mapping sono richiesti' });
    return;
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    res.status(503).json({ error: 'Database non configurato. Imposta DATABASE_URL.' });
    return;
  }

  try {
    await schemaReady;
    const result = await poolInstance.query(
      `
        insert into template_mappings (template_hash, contract_type, template_name, mapping)
        values ($1, $2, $3, $4::jsonb)
        on conflict (template_hash)
        do update set
          contract_type = excluded.contract_type,
          template_name = excluded.template_name,
          mapping = excluded.mapping,
          updated_at = now()
        returning template_hash, contract_type, template_name, mapping, updated_at
      `,
      [templateHash, contractType, templateName, JSON.stringify(mapping)],
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore database' });
  }
});

app.use(express.static(path.join(__dirname), { dotfiles: 'ignore', index: 'index.html' }));

app.listen(PORT, () => {
  process.stdout.write(`Server avviato su http://localhost:${PORT}\n`);
});

