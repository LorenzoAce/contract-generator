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

  await poolInstance.query(`
    create table if not exists contracts (
      id text primary key,
      contract_type text not null,
      name text not null,
      payload jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await poolInstance.query(`
    create table if not exists pdf_templates (
      template_hash text primary key,
      contract_type text not null,
      template_name text not null,
      content_type text not null default 'application/pdf',
      bytes bytea not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await poolInstance.query(`
    create table if not exists imported_contract_templates (
      id text primary key,
      contract_type text not null,
      contract_name text not null,
      template_hash text not null,
      template_name text not null,
      fields jsonb not null,
      metadata jsonb not null default '{}'::jsonb,
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

async function listContracts({ contractType }) {
  const normalizedContractType = normalizeText(contractType);
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const hasContractType = Boolean(normalizedContractType);
  const result = await poolInstance.query(
    `
      select id, contract_type, name, updated_at, created_at
      from contracts
      ${hasContractType ? 'where contract_type = $1' : ''}
      order by updated_at desc
      limit 200
    `,
    hasContractType ? [normalizedContractType] : [],
  );
  return result.rows;
}

async function getContract({ id }) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    throw new Error('id richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select id, contract_type, name, payload, updated_at, created_at
      from contracts
      where id = $1
      limit 1
    `,
    [normalizedId],
  );
  return result.rows[0] || null;
}

async function saveContract({ id, contractType, name, payload }) {
  const normalizedId = normalizeText(id);
  const normalizedContractType = normalizeText(contractType);
  const normalizedName = normalizeText(name);

  if (!normalizedId || !normalizedContractType || !normalizedName || !payload) {
    throw new Error('id, contractType, name e payload sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      insert into contracts (id, contract_type, name, payload)
      values ($1, $2, $3, $4::jsonb)
      on conflict (id)
      do update set
        contract_type = excluded.contract_type,
        name = excluded.name,
        payload = excluded.payload,
        updated_at = now()
      returning id, contract_type, name, payload, updated_at, created_at
    `,
    [normalizedId, normalizedContractType, normalizedName, JSON.stringify(payload)],
  );
  return result.rows[0];
}

async function deleteContract({ id }) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    throw new Error('id richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  await poolInstance.query('delete from contracts where id = $1', [normalizedId]);
}

async function listPdfTemplates({ contractType }) {
  const normalizedContractType = normalizeText(contractType);
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const hasContractType = Boolean(normalizedContractType);
  const result = await poolInstance.query(
    `
      select template_hash, contract_type, template_name, content_type,
        octet_length(bytes)::int as size,
        updated_at, created_at
      from pdf_templates
      ${hasContractType ? 'where contract_type = $1' : ''}
      order by updated_at desc
      limit 200
    `,
    hasContractType ? [normalizedContractType] : [],
  );
  return result.rows;
}

async function getPdfTemplate({ templateHash }) {
  const normalizedHash = normalizeText(templateHash);
  if (!normalizedHash) {
    throw new Error('templateHash richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select template_hash, contract_type, template_name, content_type, bytes, updated_at, created_at
      from pdf_templates
      where template_hash = $1
      limit 1
    `,
    [normalizedHash],
  );
  return result.rows[0] || null;
}

async function savePdfTemplate({ templateHash, contractType, templateName, contentType, bytes }) {
  const normalizedHash = normalizeText(templateHash);
  const normalizedContractType = normalizeText(contractType);
  const normalizedTemplateName = normalizeText(templateName);
  const normalizedContentType = normalizeText(contentType) || 'application/pdf';

  if (!normalizedHash || !normalizedContractType || !normalizedTemplateName || !bytes) {
    throw new Error('templateHash, contractType, templateName e bytes sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  await schemaReady;
  const result = await poolInstance.query(
    `
      insert into pdf_templates (template_hash, contract_type, template_name, content_type, bytes)
      values ($1, $2, $3, $4, $5)
      on conflict (template_hash)
      do update set
        contract_type = excluded.contract_type,
        template_name = excluded.template_name,
        content_type = excluded.content_type,
        bytes = excluded.bytes,
        updated_at = now()
      returning template_hash, contract_type, template_name, content_type, updated_at, created_at
    `,
    [normalizedHash, normalizedContractType, normalizedTemplateName, normalizedContentType, buffer],
  );
  return result.rows[0];
}

async function listImportedContractTemplates({ contractType }) {
  const normalizedContractType = normalizeText(contractType);
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const hasContractType = Boolean(normalizedContractType);
  const result = await poolInstance.query(
    `
      select id, contract_type, contract_name, template_hash, template_name,
        fields, metadata, updated_at, created_at
      from imported_contract_templates
      ${hasContractType ? 'where contract_type = $1' : ''}
      order by updated_at desc
      limit 200
    `,
    hasContractType ? [normalizedContractType] : [],
  );
  return result.rows;
}

async function getImportedContractTemplate({ id }) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    throw new Error('id richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select id, contract_type, contract_name, template_hash, template_name,
        fields, metadata, updated_at, created_at
      from imported_contract_templates
      where id = $1
      limit 1
    `,
    [normalizedId],
  );
  return result.rows[0] || null;
}

async function saveImportedContractTemplate({
  id,
  contractType,
  contractName,
  templateHash,
  templateName,
  fields,
  metadata,
}) {
  const normalizedId = normalizeText(id);
  const normalizedContractType = normalizeText(contractType);
  const normalizedContractName = normalizeText(contractName);
  const normalizedTemplateHash = normalizeText(templateHash);
  const normalizedTemplateName = normalizeText(templateName);
  const normalizedFields = Array.isArray(fields) ? fields : [];
  const normalizedMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};

  if (!normalizedId || !normalizedContractType || !normalizedContractName || !normalizedTemplateHash || !normalizedTemplateName || !normalizedFields.length) {
    throw new Error('id, contractType, contractName, templateHash, templateName e fields sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      insert into imported_contract_templates (
        id, contract_type, contract_name, template_hash, template_name, fields, metadata
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
      on conflict (id)
      do update set
        contract_type = excluded.contract_type,
        contract_name = excluded.contract_name,
        template_hash = excluded.template_hash,
        template_name = excluded.template_name,
        fields = excluded.fields,
        metadata = excluded.metadata,
        updated_at = now()
      returning id, contract_type, contract_name, template_hash, template_name,
        fields, metadata, updated_at, created_at
    `,
    [
      normalizedId,
      normalizedContractType,
      normalizedContractName,
      normalizedTemplateHash,
      normalizedTemplateName,
      JSON.stringify(normalizedFields),
      JSON.stringify(normalizedMetadata),
    ],
  );
  return result.rows[0];
}

async function deleteImportedContractTemplate({ id }) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    throw new Error('id richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  await poolInstance.query(
    `
      delete from imported_contract_templates
      where id = $1
    `,
    [normalizedId],
  );
}

module.exports = {
  checkHealth,
  deleteContract,
  deleteImportedContractTemplate,
  getContract,
  getImportedContractTemplate,
  getPdfTemplate,
  getTemplateMapping,
  isDatabaseConfigured,
  listContracts,
  listImportedContractTemplates,
  listPdfTemplates,
  normalizeText,
  saveContract,
  saveImportedContractTemplate,
  savePdfTemplate,
  saveTemplateMapping,
};
