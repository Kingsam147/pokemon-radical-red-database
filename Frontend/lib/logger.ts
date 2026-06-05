import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warning' | 'error';

interface EventData {
  [key: string]: unknown;
}

const frontendLogger = {
  info(eventName: string, data: EventData = {}): void {
    Sentry.addBreadcrumb({ category: eventName, data, level: 'info' });
    Sentry.captureEvent({
      message: eventName,
      level: 'info',
      extra: data,
      tags: { event_name: eventName },
    });
  },

  warn(eventName: string, data: EventData = {}): void {
    Sentry.addBreadcrumb({ category: eventName, data, level: 'warning' });
    Sentry.captureEvent({
      message: eventName,
      level: 'warning',
      extra: data,
      tags: { event_name: eventName },
    });
  },

  error(err: unknown, context: EventData = {}): void {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
      const userId = context.userId as string | undefined;
      if (userId) scope.setUser({ id: userId });
      Sentry.captureException(err);
    });
  },

  setUser(userId: string): void {
    Sentry.setUser({ id: userId });
  },

  clearUser(): void {
    Sentry.setUser(null);
  },
};

export const AUTH_EVENTS = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_ERROR: 'auth.login.error',
  LOGOUT: 'auth.logout',
  REDIRECT_CALLBACK: 'auth.redirect_callback',
  TOKEN_REFRESH_ERROR: 'auth.token.refresh_error',
} as const;

export const USER_ACTION_EVENTS = {
  TEAM_IMPORT: 'user.team.import',
  BOX_IMPORT: 'user.box.import',
  DATA_EXPORT: 'user.data.export',
} as const;

export default frontendLogger;
