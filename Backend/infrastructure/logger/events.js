const AUTH_EVENTS = {
  JWT_VALID: 'auth.jwt.valid',
  JWT_INVALID: 'auth.jwt.invalid',
  JWT_EXPIRED: 'auth.jwt.expired',
  GUEST_SESSION_CREATED: 'auth.guest.session_created',
  GUEST_SESSION_RESUMED: 'auth.guest.session_resumed',
  GUEST_MIGRATED: 'auth.guest.migrated',
  IDENTITY_RESOLVED_AUTH: 'auth.identity.resolved_authenticated',
  IDENTITY_RESOLVED_GUEST: 'auth.identity.resolved_guest',
  IDENTITY_MISSING: 'auth.identity.missing',
};

const USER_ACTION_EVENTS = {
  TEAM_CREATED: 'user.team.created',
  TEAM_DELETED: 'user.team.deleted',
  TEAM_CLEARED_ALL: 'user.team.cleared_all',
  TEAM_SAVED: 'user.team.saved',
  BOX_CREATED: 'user.box.created',
  BOX_REMOVED: 'user.box.removed',
  BOX_CLEARED: 'user.box.cleared',
  BOX_CLEARED_ALL: 'user.box.cleared_all',
  POKEMON_IMPORTED: 'user.pokemon.imported',
  POKEMON_DELETED: 'user.pokemon.deleted',
  POKEMON_UPDATED: 'user.pokemon.updated',
};

const SECURITY_EVENTS = {
  UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  SUSPICIOUS_REQUEST: 'security.suspicious_request',
  RATE_LIMITED: 'security.rate_limited',
};

const SYSTEM_EVENTS = {
  SERVER_STARTED: 'system.server.started',
  DB_CONNECTED: 'system.db.connected',
  DB_ERROR: 'system.db.error',
  UNHANDLED_ERROR: 'system.error.unhandled',
};

module.exports = { AUTH_EVENTS, USER_ACTION_EVENTS, SECURITY_EVENTS, SYSTEM_EVENTS };
