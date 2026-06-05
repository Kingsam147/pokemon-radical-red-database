const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');

const buildTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser('test-secret'));

  // Minimal route using resolveIdentity (guest path only — no live Auth0 needed)
  let resolveIdentity;
  try {
    resolveIdentity = require('../../infrastructure/auth/resolveIdentity');
  } catch {
    // If env vars are missing, use a stub that always passes as guest
    resolveIdentity = (req, _res, next) => {
      req.userId = 'stub-guest';
      req.isGuest = true;
      next();
    };
  }

  app.get('/protected', resolveIdentity, (req, res) => {
    res.json({ userId: req.userId, isGuest: req.isGuest });
  });

  app.use((err, _req, res, _next) => {
    res.status(err.status || 401).json({ message: err.message || 'Unauthorized' });
  });

  return app;
};

describe('JWT validation middleware (integration)', () => {
  let app;

  beforeAll(() => {
    process.env.AUTH0_AUDIENCE = 'https://test-audience';
    process.env.AUTH0_ISSUER_BASE_URL = 'https://test.auth0.com';
    app = buildTestApp();
  });

  test('returns 401 when no authorization header and no guest cookie', async () => {
    const response = await request(app).get('/protected');
    expect(response.status).toBe(401);
  });

  test('returns 401 when Bearer token is malformed (not a valid JWT)', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer this.is.notvalid');
    expect([401, 400]).toContain(response.status);
  });

  test('resolves guest identity from signed cookie', async () => {
    const agent = request.agent(app);
    // Set a signed cookie manually — cookieParser will verify the signature
    const cookieSecret = 'test-secret';
    const cookieSignature = require('cookie-signature');
    const signedValue = 's:' + cookieSignature.sign('guest-test-id', cookieSecret);

    const response = await agent
      .get('/protected')
      .set('Cookie', `guest_id=${encodeURIComponent(signedValue)}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe('guest-test-id');
    expect(response.body.isGuest).toBe(true);
  });

  test('returns 401 when cookie is unsigned (tampered)', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Cookie', 'guest_id=tamperedvalue');
    expect(response.status).toBe(401);
  });
});
