require('dotenv').config();
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  enabled: !!process.env.SENTRY_DSN,
});

const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require("mongoose");
const { loadModels } = require('./Config/jsonOptions');
const HydrationService = require('./infrastructure/hydration/HydrationService');
const jwtCheck = require('./infrastructure/auth/jwtCheck');
const resolveIdentity = require('./infrastructure/auth/resolveIdentity');

const PORT = process.env.PORT || 3500;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemonDB';
const MONGODB_DB = process.env.MONGODB_DB || 'pokemonDB';

// middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser(process.env.GUEST_COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check responds immediately — before the readiness gate
app.get('/health', (_req, res) => res.json({ ok: true }));

// Hold incoming requests until DB + models are ready (serverless compatible)
let ready = false;
const pendingReqs = [];

app.use((_req, _res, next) => {
    if (ready) return next();
    pendingReqs.push(next);
});

const init = mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB })
.then(async () => {
    await loadModels();
    HydrationService.load();

    // Routes must be registered after loadModels() — services use getModels() at load time
    // Public reference data — no auth required
    app.use('/misc', require('./Routes/miscRoutes'));

    // Guest identity — no auth required
    app.use('/api/guest', require('./interfaces/routes/guestRoutes'));

    // Auth routes — require real Auth0 JWT
    app.use('/api/auth', jwtCheck, require('./interfaces/routes/authRoutes'));

    // Session routes require a real Auth0 JWT (guests do not use session editing)
    app.use('/api/pokemon', jwtCheck, require('./interfaces/routes/pokemonSessionRoutes'));
    app.use('/activePokemon', jwtCheck, require('./Routes/activePokemonRoutes'));

    // Data routes accept either a valid JWT or a signed guest cookie
    app.use('/myBoxes', resolveIdentity, require('./Routes/myBoxRoutes'));
    app.use('/teams', resolveIdentity, require('./Routes/teamRoutes'));
    app.use('/', resolveIdentity, require('./Routes/pokemonRoutes'));

    ready = true;
    pendingReqs.splice(0).forEach(next => next());
});

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, _next) => {
    const status = err.status ?? 500;
    if (status === 401) {
        return res.status(401).json({ message: err.message, code: err.code, detail: err.cause?.message });
    }
    if (status >= 500) {
        const logger = require('./infrastructure/logger/logger');
        const { SYSTEM_EVENTS } = require('./infrastructure/logger/events');
        logger.error(err, {
            userId: req.userId,
            method: req.method,
            path: req.path,
            event: SYSTEM_EVENTS.UNHANDLED_ERROR,
        });
    }
    res.status(status).json({ message: err.message });
});

if (require.main === module) {
    const logger = require('./infrastructure/logger/logger');
    const { SYSTEM_EVENTS } = require('./infrastructure/logger/events');
    init.then(() => {
        logger.info(SYSTEM_EVENTS.DB_CONNECTED, { db: MONGODB_DB });
        app.listen(PORT, () => {
            logger.info(SYSTEM_EVENTS.SERVER_STARTED, { port: PORT, env: process.env.NODE_ENV });
        });
    }).catch((err) => {
        logger.error(err, { event: SYSTEM_EVENTS.DB_ERROR });
    });
}

module.exports = app;