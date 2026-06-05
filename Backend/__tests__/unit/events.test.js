const { AUTH_EVENTS, USER_ACTION_EVENTS, SECURITY_EVENTS, SYSTEM_EVENTS } = require('../../infrastructure/logger/events');

describe('Logger event constants', () => {
  test('all AUTH_EVENTS are non-empty strings', () => {
    Object.values(AUTH_EVENTS).forEach(value => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test('all USER_ACTION_EVENTS are non-empty strings', () => {
    Object.values(USER_ACTION_EVENTS).forEach(value => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test('all SECURITY_EVENTS are non-empty strings', () => {
    Object.values(SECURITY_EVENTS).forEach(value => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test('all SYSTEM_EVENTS are non-empty strings', () => {
    Object.values(SYSTEM_EVENTS).forEach(value => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test('no duplicate event names across all categories', () => {
    const all = [
      ...Object.values(AUTH_EVENTS),
      ...Object.values(USER_ACTION_EVENTS),
      ...Object.values(SECURITY_EVENTS),
      ...Object.values(SYSTEM_EVENTS),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  test('AUTH_EVENTS contains required auth lifecycle events', () => {
    expect(AUTH_EVENTS).toHaveProperty('JWT_VALID');
    expect(AUTH_EVENTS).toHaveProperty('JWT_INVALID');
    expect(AUTH_EVENTS).toHaveProperty('JWT_EXPIRED');
    expect(AUTH_EVENTS).toHaveProperty('GUEST_SESSION_CREATED');
    expect(AUTH_EVENTS).toHaveProperty('IDENTITY_RESOLVED_AUTH');
    expect(AUTH_EVENTS).toHaveProperty('IDENTITY_RESOLVED_GUEST');
  });

  test('USER_ACTION_EVENTS contains required CRUD events', () => {
    expect(USER_ACTION_EVENTS).toHaveProperty('TEAM_CREATED');
    expect(USER_ACTION_EVENTS).toHaveProperty('TEAM_DELETED');
    expect(USER_ACTION_EVENTS).toHaveProperty('BOX_CREATED');
    expect(USER_ACTION_EVENTS).toHaveProperty('POKEMON_IMPORTED');
    expect(USER_ACTION_EVENTS).toHaveProperty('POKEMON_DELETED');
    expect(USER_ACTION_EVENTS).toHaveProperty('POKEMON_UPDATED');
  });
});
