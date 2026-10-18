const crypto = require('crypto');
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
    pool.on('error', (error) => {
      console.error('PostgreSQL pool error:', error?.message || error);
    });
  }

  if (!schemaReady) {
    schemaReady = ensureSchema(pool);
  }

  return pool;
}

async function ensureSchema(poolInstance) {
  await poolInstance.query(`
    create table if not exists app_users (
      id text primary key,
      email text not null unique,
      password_hash text not null,
      full_name text not null,
      role text not null default 'user',
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await poolInstance.query(`
    create table if not exists app_sessions (
      id text primary key,
      user_id text not null references app_users(id) on delete cascade,
      session_token_hash text not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now()
    );
  `);

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
    alter table contracts
    add column if not exists owner_user_id text references app_users(id) on delete set null;
  `);

  await poolInstance.query(`
    create index if not exists idx_contracts_owner_updated_at
    on contracts (owner_user_id, updated_at desc);
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

  await poolInstance.query(`
    create table if not exists contract_signature_tokens (
      token_hash text primary key,
      contract_id text not null references contracts(id) on delete cascade,
      created_by_user_id text references app_users(id) on delete set null,
      expires_at timestamptz not null,
      used_at timestamptz null,
      created_at timestamptz not null default now()
    );
  `);

  await poolInstance.query(`
    create index if not exists idx_contract_signature_tokens_contract_id
    on contract_signature_tokens (contract_id, expires_at desc);
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

async function listContracts({ contractType, ownerUserId, isAdmin = false }) {
  const normalizedContractType = normalizeText(contractType);
  const normalizedOwnerUserId = normalizeText(ownerUserId);
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const conditions = [];
  const values = [];

  if (normalizedContractType) {
    values.push(normalizedContractType);
    conditions.push(`contracts.contract_type = $${values.length}`);
  }
  if (!isAdmin) {
    if (!normalizedOwnerUserId) {
      throw new Error('ownerUserId richiesto');
    }
    values.push(normalizedOwnerUserId);
    conditions.push(`contracts.owner_user_id = $${values.length}`);
  }

  const whereClause = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const result = await poolInstance.query(
    `
      select
        contracts.id,
        contracts.contract_type,
        contracts.name,
        contracts.owner_user_id,
        users.full_name as owner_name,
        users.email as owner_email,
        contracts.updated_at,
        contracts.created_at
      from contracts
      left join app_users as users on users.id = contracts.owner_user_id
      ${whereClause}
      order by contracts.updated_at desc
      limit 200
    `,
    values,
  );
  return result.rows;
}

async function getContract({ id, ownerUserId, isAdmin = false }) {
  const normalizedId = normalizeText(id);
  const normalizedOwnerUserId = normalizeText(ownerUserId);
  if (!normalizedId) {
    throw new Error('id richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const values = [normalizedId];
  let accessClause = '';
  if (!isAdmin) {
    if (!normalizedOwnerUserId) {
      throw new Error('ownerUserId richiesto');
    }
    values.push(normalizedOwnerUserId);
    accessClause = `and contracts.owner_user_id = $${values.length}`;
  }
  const result = await poolInstance.query(
    `
      select
        contracts.id,
        contracts.contract_type,
        contracts.name,
        contracts.payload,
        contracts.owner_user_id,
        users.full_name as owner_name,
        users.email as owner_email,
        contracts.updated_at,
        contracts.created_at
      from contracts
      left join app_users as users on users.id = contracts.owner_user_id
      where contracts.id = $1
      ${accessClause}
      limit 1
    `,
    values,
  );
  return result.rows[0] || null;
}

async function saveContract({ id, contractType, name, payload, ownerUserId }) {
  const normalizedId = normalizeText(id);
  const normalizedContractType = normalizeText(contractType);
  const normalizedName = normalizeText(name);
  const normalizedOwnerUserId = normalizeText(ownerUserId);

  if (!normalizedId || !normalizedContractType || !normalizedName || !payload || !normalizedOwnerUserId) {
    throw new Error('id, contractType, name, payload e ownerUserId sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      insert into contracts (id, contract_type, name, payload, owner_user_id)
      values ($1, $2, $3, $4::jsonb, $5)
      on conflict (id)
      do update set
        contract_type = excluded.contract_type,
        name = excluded.name,
        payload = excluded.payload,
        owner_user_id = excluded.owner_user_id,
        updated_at = now()
      returning id, contract_type, name, payload, owner_user_id, updated_at, created_at
    `,
    [normalizedId, normalizedContractType, normalizedName, JSON.stringify(payload), normalizedOwnerUserId],
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

async function countUsers() {
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query('select count(*)::int as total from app_users');
  return Number(result.rows[0]?.total || 0);
}

async function countManagedAuthUsers() {
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query('select count(*)::int as total from neon_auth."user"');
  return Number(result.rows[0]?.total || 0);
}

async function countAdminUsers({ activeOnly = true } = {}) {
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select count(*)::int as total
      from app_users
      where role = 'admin'
      ${activeOnly ? 'and is_active = true' : ''}
    `,
  );
  return Number(result.rows[0]?.total || 0);
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function buildPasswordHash(password) {
  const normalizedPassword = String(password || '');
  if (!normalizedPassword) {
    throw new Error('password richiesto');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(normalizedPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, passwordHash) {
  const normalizedPassword = String(password || '');
  const normalizedHash = String(passwordHash || '');
  const [algorithm, salt, derivedKey] = normalizedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !derivedKey) {
    return false;
  }
  const computed = crypto.scryptSync(normalizedPassword, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(derivedKey, 'hex'));
}

async function createUser({ email, password, fullName, role = 'user' }) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  const normalizedFullName = normalizeText(fullName);
  const normalizedRole = normalizeText(role).toLowerCase() === 'admin' ? 'admin' : 'user';
  if (!normalizedEmail || !normalizedFullName || !password) {
    throw new Error('email, password e fullName sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      insert into app_users (id, email, password_hash, full_name, role)
      values ($1, $2, $3, $4, $5)
      returning id, email, full_name, role, is_active, created_at, updated_at
    `,
    [createId('usr'), normalizedEmail, buildPasswordHash(password), normalizedFullName, normalizedRole],
  );
  return result.rows[0];
}

async function listUsers() {
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select id, email, full_name, role, is_active, created_at, updated_at
      from app_users
      order by role desc, full_name asc, email asc
    `,
  );
  return result.rows;
}

async function getUserByEmail(email) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select id, email, password_hash, full_name, role, is_active, created_at, updated_at
      from app_users
      where email = $1
      limit 1
    `,
    [normalizedEmail],
  );
  return result.rows[0] || null;
}

async function getUserById(id) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    return null;
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select id, email, full_name, role, is_active, created_at, updated_at
      from app_users
      where id = $1
      limit 1
    `,
    [normalizedId],
  );
  return result.rows[0] || null;
}

async function ensureManagedUser({ id, email, fullName }) {
  const normalizedId = normalizeText(id);
  const normalizedEmail = normalizeText(email).toLowerCase();
  const normalizedFullName = normalizeText(fullName) || normalizedEmail;

  if (!normalizedId || !normalizedEmail) {
    throw new Error('id ed email utente sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const existing = await getUserById(normalizedId);
  const totalUsers = existing ? 1 : await countUsers();
  const initialRole = totalUsers === 0 ? 'admin' : 'user';

  const result = await poolInstance.query(
    `
      insert into app_users (id, email, password_hash, full_name, role)
      values ($1, $2, $3, $4, $5)
      on conflict (id)
      do update set
        email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now()
      returning id, email, full_name, role, is_active, created_at, updated_at
    `,
    [normalizedId, normalizedEmail, '__managed_by_neon__', normalizedFullName, existing?.role || initialRole],
  );

  const user = result.rows[0];
  if (!existing && user?.role === 'admin') {
    await claimOrphanContracts(user.id);
  }
  if (user?.role === 'admin') {
    await promoteManagedAuthUserRole(user.id, 'admin');
  }
  return user;
}

async function promoteManagedAuthUserRole(userId, role = 'admin') {
  const normalizedUserId = normalizeText(userId);
  const normalizedRole = normalizeText(role).toLowerCase() === 'admin' ? 'admin' : 'user';
  if (!normalizedUserId) {
    return;
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    return;
  }

  await schemaReady;
  try {
    await poolInstance.query(
      `
        update neon_auth."user"
        set role = $2
        where id = $1
      `,
      [normalizedUserId, normalizedRole],
    );
  } catch (_error) {
    // Best effort: local app auth must keep working even if Neon internals change.
  }
}

async function syncManagedUserRecord({ id, email, fullName, role = 'user', isActive = true }) {
  const normalizedId = normalizeText(id);
  const normalizedEmail = normalizeText(email).toLowerCase();
  const normalizedFullName = normalizeText(fullName) || normalizedEmail;
  const normalizedRole = normalizeText(role).toLowerCase() === 'admin' ? 'admin' : 'user';

  if (!normalizedId || !normalizedEmail) {
    throw new Error('id ed email utente sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      insert into app_users (id, email, password_hash, full_name, role, is_active)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (id)
      do update set
        email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        is_active = excluded.is_active,
        updated_at = now()
      returning id, email, full_name, role, is_active, created_at, updated_at
    `,
    [normalizedId, normalizedEmail, '__managed_by_neon__', normalizedFullName, normalizedRole, Boolean(isActive)],
  );

  await promoteManagedAuthUserRole(normalizedId, normalizedRole);
  return result.rows[0];
}

async function updateManagedUserRecord({ id, fullName, role, isActive }) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    throw new Error('id richiesto');
  }

  const existing = await getUserById(normalizedId);
  if (!existing) {
    throw new Error('Utente non trovato');
  }

  const nextFullName = normalizeText(fullName) || existing.full_name;
  const nextRole = normalizeText(role).toLowerCase() === 'admin' ? 'admin' : 'user';
  const nextIsActive = typeof isActive === 'boolean' ? isActive : existing.is_active;

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      update app_users
      set
        full_name = $2,
        role = $3,
        is_active = $4,
        updated_at = now()
      where id = $1
      returning id, email, full_name, role, is_active, created_at, updated_at
    `,
    [normalizedId, nextFullName, nextRole, nextIsActive],
  );

  await promoteManagedAuthUserRole(normalizedId, nextRole);
  return result.rows[0] || null;
}

async function deleteUserById({ id }) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) {
    throw new Error('id richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  await poolInstance.query('delete from app_users where id = $1', [normalizedId]);
}

async function authenticateUser({ email, password }) {
  const user = await getUserByEmail(email);
  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function createSession({ userId, daysToLive = 30 }) {
  const normalizedUserId = normalizeText(userId);
  if (!normalizedUserId) {
    throw new Error('userId richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + daysToLive * 24 * 60 * 60 * 1000);

  await schemaReady;
  await poolInstance.query(
    `
      insert into app_sessions (id, user_id, session_token_hash, expires_at)
      values ($1, $2, $3, $4)
    `,
    [createId('ses'), normalizedUserId, hashToken(rawToken), expiresAt.toISOString()],
  );

  return {
    token: rawToken,
    expiresAt: expiresAt.toISOString(),
  };
}

async function getSessionUserByToken(token) {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) {
    return null;
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const tokenHash = hashToken(normalizedToken);
  const result = await poolInstance.query(
    `
      select
        sessions.id as session_id,
        sessions.expires_at,
        users.id,
        users.email,
        users.full_name,
        users.role,
        users.is_active
      from app_sessions as sessions
      inner join app_users as users on users.id = sessions.user_id
      where sessions.session_token_hash = $1
        and sessions.expires_at > now()
        and users.is_active = true
      limit 1
    `,
    [tokenHash],
  );

  const row = result.rows[0] || null;
  if (!row) {
    return null;
  }

  await poolInstance.query(
    `
      update app_sessions
      set last_seen_at = now()
      where session_token_hash = $1
    `,
    [tokenHash],
  );

  return row;
}

async function deleteSession(token) {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) {
    return;
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  await poolInstance.query(
    `
      delete from app_sessions
      where session_token_hash = $1
    `,
    [hashToken(normalizedToken)],
  );
}

async function claimOrphanContracts(ownerUserId) {
  const normalizedOwnerUserId = normalizeText(ownerUserId);
  if (!normalizedOwnerUserId) {
    throw new Error('ownerUserId richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  await poolInstance.query(
    `
      update contracts
      set owner_user_id = $1
      where owner_user_id is null
    `,
    [normalizedOwnerUserId],
  );
}

async function createSignatureToken({ contractId, createdByUserId, daysToLive = 14 }) {
  const normalizedContractId = normalizeText(contractId);
  const normalizedCreatedByUserId = normalizeText(createdByUserId);
  if (!normalizedContractId) {
    throw new Error('contractId richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const rawToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + daysToLive * 24 * 60 * 60 * 1000);
  await poolInstance.query(
    `
      insert into contract_signature_tokens (token_hash, contract_id, created_by_user_id, expires_at)
      values ($1, $2, $3, $4)
    `,
    [hashToken(rawToken), normalizedContractId, normalizedCreatedByUserId || null, expiresAt.toISOString()],
  );
  return {
    token: rawToken,
    expiresAt: expiresAt.toISOString(),
  };
}

async function getContractBySignatureToken(token) {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) {
    throw new Error('token richiesto');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const result = await poolInstance.query(
    `
      select
        contracts.id,
        contracts.contract_type,
        contracts.name,
        contracts.payload,
        contracts.owner_user_id,
        signature_tokens.expires_at
      from contract_signature_tokens as signature_tokens
      inner join contracts on contracts.id = signature_tokens.contract_id
      where signature_tokens.token_hash = $1
        and signature_tokens.expires_at > now()
      limit 1
    `,
    [hashToken(normalizedToken)],
  );
  return result.rows[0] || null;
}

async function saveContractBySignatureToken({ token, name, payload }) {
  const normalizedToken = normalizeText(token);
  const normalizedName = normalizeText(name);
  if (!normalizedToken || !normalizedName || !payload) {
    throw new Error('token, name e payload sono richiesti');
  }

  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error('Database non configurato. Imposta DATABASE_URL.');
  }

  await schemaReady;
  const contract = await getContractBySignatureToken(normalizedToken);
  if (!contract) {
    throw new Error('Link firma non valido o scaduto');
  }

  const result = await poolInstance.query(
    `
      update contracts
      set name = $1,
          payload = $2::jsonb,
          updated_at = now()
      where id = $3
      returning id, contract_type, name, payload, owner_user_id, updated_at, created_at
    `,
    [normalizedName, JSON.stringify(payload), contract.id],
  );

  await poolInstance.query(
    `
      update contract_signature_tokens
      set used_at = now()
      where token_hash = $1
    `,
    [hashToken(normalizedToken)],
  );

  return result.rows[0] || null;
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
  authenticateUser,
  checkHealth,
  claimOrphanContracts,
  countAdminUsers,
  countManagedAuthUsers,
  countUsers,
  createSession,
  createSignatureToken,
  createUser,
  deleteContract,
  deleteUserById,
  deleteSession,
  deleteImportedContractTemplate,
  getContractBySignatureToken,
  getContract,
  getImportedContractTemplate,
  getPdfTemplate,
  getTemplateMapping,
  getUserById,
  ensureManagedUser,
  isDatabaseConfigured,
  listUsers,
  listContracts,
  listImportedContractTemplates,
  listPdfTemplates,
  normalizeText,
  promoteManagedAuthUserRole,
  saveContract,
  saveContractBySignatureToken,
  saveImportedContractTemplate,
  savePdfTemplate,
  saveTemplateMapping,
  syncManagedUserRecord,
  updateManagedUserRecord,
  getSessionUserByToken,
};
