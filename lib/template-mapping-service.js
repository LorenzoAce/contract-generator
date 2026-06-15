const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

let pool = null;
let schemaReady = null;

function normalizeText(value) {
  return String(value || '').trim();
}

function isDatabaseConfigured() {
  return Boolean(DATABASE_URL);
}

function getPool() {
  if (!isDatabaseConfigured()) {
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

async function checkHealth() {
  if (!isDatabaseConfigured()) {
    return { ok: true, dbConfigured: false };
  }

  const poolInstance = getPool();
  await schemaReady;
  await poolInstance.query('select 1 as ok');
  return { ok: true, dbConfigured: true };
}

async function getTemplateMapping({ templateHash, contractType }) {
  const normalizedHash = normalizeText(templateHash);
  const normalizedContractType = normalizeText(contractType);

  if (!normalizedHash) {
    throw new Error('templateHash richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const hasContractType = Boolean(normalizedContractType);
  const result = await poolInstance.query(
    `
      select template_hash, contract_type, template_name, mapping, updated_at
      from template_mappings
      where template_hash = $1
      ${hasContractType ? 'and contract_type = $2' : ''}
      limit 1
    `,
    hasContractType ? [normalizedHash, normalizedContractType] : [normalizedHash],
  );

  return result.rows[0] || null;
}

async function saveTemplateMapping({ templateHash, contractType, templateName, mapping }) {
  const normalizedHash = normalizeText(templateHash);
  const normalizedContractType = normalizeText(contractType);
  const normalizedTemplateName = normalizeText(templateName);

  if (!normalizedHash || !normalizedContractType || !normalizedTemplateName || !mapping) {
    throw new Error('templateHash, contractType, templateName e mapping sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

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
    [normalizedHash, normalizedContractType, normalizedTemplateName, JSON.stringify(mapping)],
  );

  return result.rows[0];
}

module.exports = {
  checkHealth,
  getTemplateMapping,
  isDatabaseConfigured,
  normalizeText,
  saveTemplateMapping,
};
