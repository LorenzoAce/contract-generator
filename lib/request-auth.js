const {
  countManagedAuthUsers,
  countUsers,
  ensureManagedUser,
  normalizeText,
} = require('./template-mapping-service');

let joseModulePromise = null;
let jwksResolverPromise = null;

function getAuthBaseUrl() {
  return normalizeText(process.env.NEON_AUTH_BASE_URL || process.env.NEXT_PUBLIC_NEON_AUTH_URL);
}

function getAuthJwksUrl() {
  const explicitUrl = normalizeText(process.env.NEON_AUTH_JWKS_URL);
  if (explicitUrl) {
    return explicitUrl;
  }
  const baseUrl = getAuthBaseUrl();
  if (!baseUrl) {
    return '';
  }
  return `${baseUrl.replace(/\/+$/, '')}/.well-known/jwks.json`;
}

function getAuthorizationBearer(req) {
  const header = normalizeText(req?.headers?.authorization);
  if (!header) {
    return '';
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  return normalizeText(match?.[1]);
}

async function getJoseModule() {
  if (!joseModulePromise) {
    joseModulePromise = import('jose');
  }
  return joseModulePromise;
}

async function getRemoteJwks() {
  const jwksUrl = getAuthJwksUrl();
  if (!jwksUrl) {
    throw new Error('Neon Auth non configurato. Imposta NEON_AUTH_BASE_URL.');
  }
  if (!jwksResolverPromise) {
    jwksResolverPromise = getJoseModule().then(({ createRemoteJWKSet }) => createRemoteJWKSet(new URL(jwksUrl)));
  }
  return jwksResolverPromise;
}

async function verifyAccessToken(token) {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) {
    return null;
  }

  const { jwtVerify } = await getJoseModule();
  const jwks = await getRemoteJwks();
  const { payload } = await jwtVerify(normalizedToken, jwks);
  return payload || null;
}

function mapPayloadToManagedUser(payload) {
  const normalizedPayload = payload && typeof payload === 'object' ? payload : {};
  const userId = normalizeText(
    normalizedPayload.sub
      || normalizedPayload.userId
      || normalizedPayload.user_id
      || normalizedPayload.user?.id,
  );
  const email = normalizeText(
    normalizedPayload.email
      || normalizedPayload.user?.email,
  ).toLowerCase();
  const fullName = normalizeText(
    normalizedPayload.name
      || normalizedPayload.user?.name
      || normalizedPayload.given_name
      || email,
  );
  return {
    id: userId,
    email,
    fullName: fullName || email,
  };
}

async function resolveRequestUser(req) {
  const accessToken = getAuthorizationBearer(req);
  if (!accessToken) {
    return null;
  }

  const payload = await verifyAccessToken(accessToken);
  const managedUser = mapPayloadToManagedUser(payload);
  if (!managedUser.id || !managedUser.email) {
    return null;
  }

  const localUser = await ensureManagedUser(managedUser);
  if (!localUser?.is_active) {
    throw new Error('Utente disattivato.');
  }
  return {
    id: localUser.id,
    email: localUser.email,
    full_name: localUser.full_name,
    role: localUser.role,
    is_active: localUser.is_active,
    is_admin: localUser.role === 'admin',
  };
}

async function requireAuth(req, res) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'Accesso richiesto.' });
      return null;
    }
    req.authUser = user;
    return user;
  } catch (error) {
    const message = normalizeText(error?.message) || 'Sessione Neon non valida.';
    const statusCode = message.includes('Neon Auth non configurato') ? 503 : 401;
    res.status(statusCode).json({ error: message });
    return null;
  }
}

async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) {
    return null;
  }
  if (!user.is_admin) {
    res.status(403).json({ error: 'Permessi amministratore richiesti.' });
    return null;
  }
  return user;
}

async function getBootstrapStatus() {
  const totalUsers = await countUsers();
  const totalManagedUsers = await countManagedAuthUsers();
  return {
    initialized: totalUsers > 0 || totalManagedUsers > 0,
    totalUsers,
    totalManagedUsers,
    authConfigured: Boolean(getAuthBaseUrl()),
  };
}

module.exports = {
  getAuthBaseUrl,
  getAuthJwksUrl,
  getAuthorizationBearer,
  getBootstrapStatus,
  requireAdmin,
  requireAuth,
  resolveRequestUser,
};
