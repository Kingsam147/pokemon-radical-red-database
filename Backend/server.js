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
const jwtCheck = require('./identity/jwtCheck');
const resolveIdentity = require('./identity/resolveIdentity');
const redis = require('./infrastructure/redis/redisClient');
const rateLimiter = require('./infrastructure/rateLimit/rateLimiter');

// Fire the Redis connection attempt immediately, independent of Mongo, so rate
// limiting is enforced as soon as possible. redisClient.sendCommand checks the
// connection state lazily per-request, so registering the limiter below doesn't
// need to wait on this settling.
redis.connect();

const PORT = process.env.PORT || 3500;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemonDB';
const MONGODB_DB = process.env.MONGODB_DB || 'Radical-Red-Database';

// middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(cookieParser(process.env.GUEST_COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(rateLimiter.globalLimiter);

let ready = false;
let initFailed = false;
const pendingReqs = [];

app.get('/health', (_req, res) => res.json({ ok: true, ready }));

app.use((_req, _res, next) => {
    if (ready) return next();
    if (initFailed) return next(Object.assign(new Error('Service unavailable — initialisation failed'), { status: 503 }));
    pendingReqs.push(next);
});

const initTimeoutId = setTimeout(() => {
    if (!ready && pendingReqs.length > 0) {
        initFailed = true;
        const timeoutError = Object.assign(new Error('Service unavailable — initialisation timed out'), { status: 503 });
        pendingReqs.splice(0).forEach(next => next(timeoutError));
        console.error('[DB_INIT_TIMEOUT] Drained pending requests after 15s');
    }
}, 15000);

const init = mongoose.connect(MONGODB_URI, {
    dbName: MONGODB_DB,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
})
.then(async () => {
    const { loadModels } = require('./game-data/loadModels');
    const HydrationService = require('./pokemon/HydrationService');
    await loadModels();
    HydrationService.load();

    app.use('/misc/damage', rateLimiter.calcLimiter);
    app.use('/misc', require('./interfaces/routes/miscRoutes'));
    app.use('/public', require('./interfaces/routes/publicRoutes'));
    app.use('/api/guest/init', rateLimiter.guestInitLimiter);
    app.use('/api/guest', require('./interfaces/routes/guestRoutes'));
    app.use('/api/auth', jwtCheck, require('./interfaces/routes/authRoutes'));
    app.use('/api/pokemon', jwtCheck, require('./interfaces/routes/pokemonSessionRoutes'));
    app.use('/activePokemon', jwtCheck, require('./interfaces/routes/activePokemonRoutes'));
    app.use('/myBoxes', resolveIdentity, require('./interfaces/routes/myBoxRoutes'));
    app.use('/teams', resolveIdentity, require('./interfaces/routes/teamRoutes'));
    app.use('/', resolveIdentity, require('./interfaces/routes/pokemonRoutes'));

    clearTimeout(initTimeoutId);
    ready = true;
    pendingReqs.splice(0).forEach(next => next());
})
.catch((err) => {
    initFailed = true;
    const initError = Object.assign(new Error('Service unavailable — database failed to initialise'), { status: 503 });
    pendingReqs.splice(0).forEach(next => next(initError));
    console.error('[DB_INIT_ERROR]', err.message, err.code ?? '');
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
        if (initFailed) {
            console.error('[SERVER_DEGRADED] Initialisation failed — only /health will respond until restarted with valid database credentials.');
        } else {
            logger.info(SYSTEM_EVENTS.DB_CONNECTED, { db: MONGODB_DB });
            console.log(`[DB_CONNECTED] db=${MONGODB_DB}`);
        }
        app.listen(PORT, () => {
            logger.info(SYSTEM_EVENTS.SERVER_STARTED, { port: PORT, env: process.env.NODE_ENV });
            console.log(`[SERVER_STARTED] port=${PORT} env=${process.env.NODE_ENV}`);
        });
    });
}

module.exports = app;