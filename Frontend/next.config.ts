import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Pin the workspace root to this directory. This repo has two lockfiles — the
  // npm-workspaces `package-lock.json` at the monorepo root and this app's own
  // pnpm setup — so Turbopack otherwise guesses the monorepo root and resolves
  // the Tailwind v4 `@import "tailwindcss"` against a node_modules that doesn't
  // have it, breaking `next dev` with "Can't resolve 'tailwindcss'".
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || 'pokemon-radical-red',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
