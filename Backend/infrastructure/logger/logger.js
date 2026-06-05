const Sentry = require('@sentry/node');

const logger = {
  /**
   * Log an informational user/system event as a Sentry breadcrumb + custom event.
   * Use for auth flows, user actions, and lifecycle signals.
   */
  info(eventName, data = {}) {
    Sentry.addBreadcrumb({ category: eventName, data, level: 'info' });
    Sentry.captureEvent({
      message: eventName,
      level: 'info',
      extra: data,
      tags: { event_name: eventName },
    });
  },

  /**
   * Log a warning — validation failures, 400/404 responses, non-critical issues.
   */
  warn(eventName, data = {}) {
    Sentry.addBreadcrumb({ category: eventName, data, level: 'warning' });
    Sentry.captureEvent({
      message: eventName,
      level: 'warning',
      extra: data,
      tags: { event_name: eventName },
    });
  },

  /**
   * Log a security event — unauthorized access, token rejection, suspicious behavior.
   */
  security(eventName, data = {}) {
    Sentry.captureEvent({
      message: eventName,
      level: 'warning',
      extra: data,
      tags: { event_name: eventName, category: 'security' },
    });
  },

  /**
   * Capture an exception with optional context. Always use for caught errors
   * that indicate a real failure (5xx class).
   */
  error(err, context = {}) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
      if (context.userId) scope.setUser({ id: context.userId });
      Sentry.captureException(err);
    });
  },

  /**
   * Set the active user on the Sentry scope for the current request.
   * Call this after identity resolution so subsequent events are linked.
   */
  setUser(userId, isGuest = false) {
    Sentry.setUser({ id: userId, segment: isGuest ? 'guest' : 'authenticated' });
  },

  /**
   * Clear user context — call on logout or when processing unauthenticated requests.
   */
  clearUser() {
    Sentry.setUser(null);
  },
};

module.exports = logger;
