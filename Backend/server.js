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
const jwtCheck = require('./infrastructure/auth/jwtCheck');
const resolveIdentity = require('./infrastructure/auth/resolveIdentity');

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
    const { loadModels } = require('./Config/jsonOptions');
    const HydrationService = require('./infrastructure/hydration/HydrationService');
    const redis = require('./infrastructure/redis/redisClient');
    redis.connect();
    await loadModels();
    HydrationService.load();

    app.use('/misc', require('./Routes/miscRoutes'));
    app.use('/api/guest', require('./interfaces/routes/guestRoutes'));
    app.use('/api/auth', jwtCheck, require('./interfaces/routes/authRoutes'));
    app.use('/api/pokemon', jwtCheck, require('./interfaces/routes/pokemonSessionRoutes'));
    app.use('/activePokemon', jwtCheck, require('./Routes/activePokemonRoutes'));
    app.use('/myBoxes', resolveIdentity, require('./Routes/myBoxRoutes'));
    app.use('/teams', resolveIdentity, require('./Routes/teamRoutes'));
    app.use('/', resolveIdentity, require('./Routes/pokemonRoutes'));

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
        logger.info(SYSTEM_EVENTS.DB_CONNECTED, { db: MONGODB_DB });
        app.listen(PORT, () => {
            logger.info(SYSTEM_EVENTS.SERVER_STARTED, { port: PORT, env: process.env.NODE_ENV });
        });
    });
}

module.exports = app;