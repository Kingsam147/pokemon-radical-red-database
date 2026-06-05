'use client';

import { Auth0Provider, useAuth0, type AppState } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { registerTokenGetter } from '@/lib/infrastructure/apiClient';
import frontendLogger, { AUTH_EVENTS } from '@/lib/logger';

const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!;
const AUTH0_AUDIENCE = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE!;

function TokenInterceptorSetup() {
  const { getAccessTokenSilently, isAuthenticated, user, error } = useAuth0();

  useEffect(() => {
    if (error) {
      frontendLogger.error(error, { event: AUTH_EVENTS.LOGIN_ERROR });
    }
  }, [error]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (user?.sub) {
      frontendLogger.setUser(user.sub);
      frontendLogger.info(AUTH_EVENTS.LOGIN_SUCCESS, { userId: user.sub });
    }

    registerTokenGetter(async () => {
      try {
        return await getAccessTokenSilently({ authorizationParams: { audience: AUTH0_AUDIENCE } });
      } catch (err) {
        frontendLogger.error(err, { event: AUTH_EVENTS.TOKEN_REFRESH_ERROR });
        throw err;
      }
    });
  }, [isAuthenticated, getAccessTokenSilently, user]);

  return null;
}

export default function Auth0ProviderWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const onRedirectCallback = (appState?: AppState) => {
    frontendLogger.info(AUTH_EVENTS.REDIRECT_CALLBACK, { returnTo: appState?.returnTo });
    router.push(appState?.returnTo ?? window.location.pathname);
  };

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
        audience: AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
      onRedirectCallback={onRedirectCallback}
    >
      <TokenInterceptorSetup />
      {children}
    </Auth0Provider>
  );
}
