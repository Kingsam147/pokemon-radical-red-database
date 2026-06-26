# Pokemon Radical Red Database

**Live:** https://pokemon-damage-calculator-gamma.vercel.app

A full-stack Pokemon damage calculator and team builder for the Radical Red ROM hack. Built to fill the gap left by mainline tools that do not account for Radical Red's custom moves, abilities, and stat changes.

Supports both guest sessions (no account required) and Auth0-authenticated accounts for persisting teams and box data across sessions.

## Features

- **Damage calculator** - computes damage ranges for any move/Pokemon matchup using the main Pokemon repo, Smogon formula engine, an already existing and popular tool. Adapted API calls to match the Pokemon objects and layout of the repo, and Radical Red's modified stats and move data
- **Team builder** - build and save teams of up to 6 Pokemon with full moveset and item selection
- **Box system** - store Pokemon in persistent boxes, accessible across sessions when signed in
- **Guest sessions** - anonymous users get a signed cookie session to save progress without creating an account
- **Auth0 authentication** - sign in to persist teams and boxes permanently across devices
- **Hydration system** - Pokemon data is loaded from MongoDB into memory at startup for low-latency lookups

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Node.js - Express 5 - TypeScript - MongoDB - Mongoose |
| Auth | Auth0 (express-oauth2-jwt-bearer) - Guest cookie sessions |
| Infrastructure | Redis (rate limiting) - AWS S3 (asset storage) - Sentry (error monitoring) |
| Frontend | Next.js 16 - React 19 - TypeScript - Tailwind CSS - shadcn/ui |
| Testing | Jest - Supertest - mongodb-memory-server - Playwright (E2E) |
| Deployment | Docker - Vercel - Cloudflare |

## Architecture

This is a monorepo with two npm workspaces:

```
pokemon-radical-red-database/
├── Backend/                    # Node.js / Express API
│   ├── Domain/                 # Pokemon data parsing and game logic
│   ├── Controllers/            # Route handlers
│   ├── Routes/                 # Express routers
│   ├── interfaces/             # Auth-aware route layer
│   ├── infrastructure/         # Redis, auth, repositories, hydration, logger
│   └── __tests__/              # Unit and integration tests
└── Frontend/                   # Next.js 16 app
    ├── app/                    # App Router pages
    ├── components/             # UI components (shadcn/ui)
    └── e2e/                    # Playwright E2E tests
```

### Layering and separation of concerns

The backend separates concerns across four explicit layers:

**Domain** - pure game logic with no framework dependencies. Move legality checking, stat calculations, type interaction matrices, and text parsing all live here. None of these functions import from Express, Mongoose, or any infrastructure library. This makes them trivially testable and replaceable.

**Infrastructure** - everything that talks to an external system: the Redis client, MongoDB repositories, Auth0 JWT verification, the S3 uploader, and the structured logger. Each concern is isolated to its own module. The rest of the application depends on interfaces, not concrete implementations.

**Controllers** - thin handlers that delegate to domain functions or infrastructure calls. They do not contain business logic. A controller's job is to validate the incoming shape, call the right function, and return the right status code.

**Interfaces (routes)** - the Express router layer. This is kept separate from controllers so that route composition and middleware application (auth guards, rate limiters) can be changed without touching handler logic.

### MongoDB data access patterns

The primary query patterns for this application are:

- **Lookups by Pokemon species** - the most frequent operation (damage calc, team building). All Pokemon documents are indexed on `speciesId`. After startup, the hydration service loads the full dataset into a Map in application memory, eliminating database round-trips for every calculator request.
- **Team and box reads by userId** - authenticated users fetch their saved teams and boxes. These are indexed on `userId` to ensure O(log n) lookups regardless of total document count.
- **Guest session state** - guest data is stored in a signed cookie rather than the database. This eliminates a database write on every guest interaction and avoids building a TTL-based cleanup job for abandoned sessions.

MongoDB was chosen over PostgreSQL for this data because Pokemon data is naturally document-shaped (a single species entry contains nested arrays of moves, abilities, and learnable move sets with no foreign-key relationships needed), and the query patterns are predominantly point lookups rather than joins or aggregations.

### Caching strategy

| Data | Layer | TTL | Reasoning |
|---|---|---|---|
| Full Pokemon dataset | Application memory (Map) | Process lifetime | Read-only reference data - loading once at startup costs ~200ms and saves a round-trip on every calc request |
| Rate limit counters | Redis | 1 min (auth), window-matched (other) | Shared across instances; must survive restarts |
| Damage calc results | Not cached | - | Results depend on user-provided inputs (EVs, IVs, boosts) that vary per request; cache hit rate would be negligible |

### Server readiness gate

The backend uses a readiness gate pattern. On startup, all incoming requests are queued internally until MongoDB finishes connecting and the Pokemon hydration step completes. Requests that arrive before the server is ready are held, not rejected. Once ready, the pending queue is drained in order. If initialisation times out (15 seconds) or fails, all pending requests receive a 503 with a structured error.

This prevents the common failure mode where a cold-started server returns 404 or 500 to the first requests while still loading - which matters especially on Vercel where instances spin up on demand.

### Auth and identity resolution

Two auth strategies coexist:

- **`jwtCheck`** - validates the Auth0 JWT on routes that require a real account (team save, box management). Logs the outcome (valid, expired, invalid) as a structured security event.
- **`resolveIdentity`** - a softer guard used on browsing routes. It attempts to verify the JWT if one is present, and falls back to the guest cookie if not. Both paths succeed - the difference is whether the resolved userId is from Auth0 or the guest session. This allows the same routes to serve both authenticated and anonymous users without duplicating handlers.

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB instance (local or Atlas)
- Redis instance
- Auth0 account (for authenticated routes)
- AWS S3 bucket (for asset storage)

### Backend setup

```bash
cd Backend
npm install
```

Create a `.env` file:

```env
PORT=3500
MONGODB_URI=mongodb://localhost:27017/pokemonDB
MONGODB_DB=Radical-Red-Database
CORS_ORIGIN=http://localhost:3000
REDIS_URL=redis://localhost:6379
GUEST_COOKIE_SECRET=your-cookie-secret

AUTH0_AUDIENCE=your-auth0-api-audience
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com

AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name

SENTRY_DSN=your-sentry-dsn
NODE_ENV=development
```

```bash
npm run dev
```

### Frontend setup

```bash
cd Frontend
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3500
AUTH0_SECRET=your-auth0-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

```bash
npm run dev
```

### Docker

```bash
docker-compose up --build
```

## Running Tests

```bash
# Backend unit tests
cd Backend && npm test

# Backend integration tests (requires running MongoDB and Redis)
cd Backend && npm run test:integration

# Frontend E2E tests
cd Frontend && npm run test:e2e
```
