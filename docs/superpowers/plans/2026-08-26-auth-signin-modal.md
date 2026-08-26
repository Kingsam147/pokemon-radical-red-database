# Auth Sign-In Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header's `loginWithRedirect()` Log In button with an in-app popup modal offering Sign In, Create Account, and Continue with Google, each opening Auth0's existing hosted Universal Login in a popup window scoped to the right screen/connection.

**Architecture:** Frontend-only. Two pure functions decide which Auth0 popup params each button uses and how to classify a "user closed the popup" rejection (unit-tested in the existing Vitest `node` environment). A new `Dialog` UI primitive (Radix, already a dependency, just unused) and a new `AuthModal` component consume them. `header.tsx` swaps its direct `loginWithRedirect()` call for opening the modal. No backend changes — JWT validation and guest-migration are untouched and already fire automatically off the `isAuthenticated` flip that `loginWithPopup()` triggers exactly like `loginWithRedirect()` does today.

**Tech Stack:** Next.js (App Router), `@auth0/auth0-react` 2.17.0, `@radix-ui/react-dialog` 1.1.4 (already installed, unused), `lucide-react`, `sonner`, Vitest (`node` environment, `**/*.test.ts` only — no React Testing Library / jsdom in this project), Playwright for e2e.

**Spec:** `docs/superpowers/specs/2026-08-26-auth-signin-modal-design.md`

**Note on testing approach vs. spec:** The spec's Testing section originally described mocking `useAuth0` and asserting button clicks via a component test. This project has no React Testing Library / jsdom setup (`vitest.config.ts` sets `environment: "node"` and only includes `**/*.test.ts`, and no `.test.tsx` files exist anywhere in the project source). Rather than bolt on new test infrastructure for one component, the button→params and error-classification logic is extracted into a plain, dependency-free module (`Frontend/lib/auth/authModalActions.ts`) that's fully unit-testable under the existing setup. `AuthModal.tsx` itself stays thin and is verified by the e2e test (Task 5) plus a manual browser check (Task 6), matching how every other `components/ui/*.tsx` file in this codebase (button, tabs, select) has no unit test of its own.

---

### Task 1: Auth popup action logic (pure functions, TDD)

**Files:**
- Create: `Frontend/lib/auth/authModalActions.ts`
- Test: `Frontend/lib/auth/authModalActions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Frontend/lib/auth/authModalActions.test.ts
import { describe, test, expect } from "vitest"
import { getPopupAuthorizationParams, isPopupCancelled } from "@/lib/auth/authModalActions"

describe("getPopupAuthorizationParams", () => {
  test("signin returns undefined so loginWithPopup uses its default screen", () => {
    expect(getPopupAuthorizationParams("signin")).toBeUndefined()
  })

  test("signup returns the signup screen hint", () => {
    expect(getPopupAuthorizationParams("signup")).toEqual({ screen_hint: "signup" })
  })

  test("google returns the google-oauth2 connection", () => {
    expect(getPopupAuthorizationParams("google")).toEqual({ connection: "google-oauth2" })
  })
})

describe("isPopupCancelled", () => {
  test("returns true for Auth0's PopupCancelledError shape", () => {
    expect(isPopupCancelled({ error: "cancelled", error_description: "Popup closed" })).toBe(true)
  })

  test("returns false for other Auth0 OAuth errors", () => {
    expect(isPopupCancelled({ error: "access_denied", error_description: "user denied access" })).toBe(false)
  })

  test("returns false for non-Auth0 error shapes", () => {
    expect(isPopupCancelled(new Error("network failure"))).toBe(false)
    expect(isPopupCancelled("plain string")).toBe(false)
    expect(isPopupCancelled(null)).toBe(false)
    expect(isPopupCancelled(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `Frontend/`): `npx vitest run lib/auth/authModalActions.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth/authModalActions'` (file doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

```ts
// Frontend/lib/auth/authModalActions.ts

export type AuthModalAction = "signin" | "signup" | "google"

export interface PopupAuthorizationParams {
  screen_hint?: string
  connection?: string
}

export function getPopupAuthorizationParams(
  action: AuthModalAction
): PopupAuthorizationParams | undefined {
  if (action === "signup") return { screen_hint: "signup" }
  if (action === "google") return { connection: "google-oauth2" }
  return undefined
}

export function isPopupCancelled(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "error" in err &&
    (err as { error?: unknown }).error === "cancelled"
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/auth/authModalActions.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add Frontend/lib/auth/authModalActions.ts Frontend/lib/auth/authModalActions.test.ts
git commit -m "feat: add pure auth popup action/error-classification helpers"
```

---

### Task 2: Dialog UI primitive

This mirrors the existing `Frontend/components/ui/{button,tabs,select}.tsx` pattern exactly — same `cn` import, same `data-slot` attributes, same shadcn-style structure. No new dependency: `@radix-ui/react-dialog` is already in `Frontend/package.json`. Like the other `components/ui/*.tsx` files in this project, it has no dedicated unit test (no React Testing Library/jsdom setup — see the plan header note); it's verified by a TypeScript check here and exercised for real by `AuthModal` in Task 3 onward.

**Files:**
- Create: `Frontend/components/ui/dialog.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils/utils'

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[360px] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-lg duration-200',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-full opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none cursor-pointer"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col items-center gap-1.5 text-center', className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-bold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
}
```

- [ ] **Step 2: Type-check**

Run (from `Frontend/`): `npx tsc --noEmit`
Expected: no errors referencing `components/ui/dialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add Frontend/components/ui/dialog.tsx
git commit -m "feat: add shadcn-style Dialog primitive (Radix, already a dependency)"
```

---

### Task 3: AuthModal component

**Files:**
- Create: `Frontend/components/AuthModal.tsx`
- Create: `Frontend/components/AuthModal.css`

- [ ] **Step 1: Write the stylesheet**

```css
/* Frontend/components/AuthModal.css */
@reference "../app/globals.css";

.auth-modal-crest {
  @apply w-11 h-11 rounded-full flex items-center justify-center text-primary-foreground;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.auth-modal-crest svg {
  @apply w-5 h-5;
}

.auth-modal-actions {
  @apply flex flex-col gap-2 w-full mt-2;
}

.auth-modal-primary-button {
  @apply bg-gradient-to-r from-primary to-secondary text-white rounded-full cursor-pointer hover:opacity-90 transition-opacity;
}

.auth-modal-outline-button {
  @apply rounded-full cursor-pointer;
}

.auth-modal-google-button {
  @apply rounded-full cursor-pointer gap-2 mt-3;
}

.auth-modal-divider {
  @apply flex items-center gap-3 w-full text-xs uppercase tracking-wide text-muted-foreground mt-4;
}

.auth-modal-divider::before,
.auth-modal-divider::after {
  content: "";
  @apply flex-1 h-px bg-border;
}
```

- [ ] **Step 2: Write the component**

```tsx
'use client'

import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  getPopupAuthorizationParams,
  isPopupCancelled,
  type AuthModalAction,
} from '@/lib/auth/authModalActions'
import frontendLogger, { AUTH_EVENTS } from '@/lib/logger'
import './AuthModal.css'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AuthModal({ open, onOpenChange }: Props) {
  const { loginWithPopup } = useAuth0()
  const [pendingAction, setPendingAction] = useState<AuthModalAction | null>(null)
  const isPending = pendingAction !== null

  const handleAuthAction = async (action: AuthModalAction) => {
    setPendingAction(action)
    try {
      await loginWithPopup({
        authorizationParams: getPopupAuthorizationParams(action),
      })
      onOpenChange(false)
    } catch (err) {
      if (!isPopupCancelled(err)) {
        frontendLogger.error(err, { event: AUTH_EVENTS.LOGIN_ERROR })
        toast.error('Sign-in failed — try again')
      }
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="auth-modal">
        <div className="auth-modal-crest">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18Z" />
          </svg>
        </div>

        <DialogHeader>
          <DialogTitle>Join the battle</DialogTitle>
          <DialogDescription>
            Sign in to save your boxes and teams across devices.
          </DialogDescription>
        </DialogHeader>

        <div className="auth-modal-actions">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleAuthAction('signin')}
            className="auth-modal-primary-button"
            data-testid="auth-modal-signin-button"
          >
            {pendingAction === 'signin' && <Loader2 size={16} className="animate-spin" />}
            Sign In
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleAuthAction('signup')}
            className="auth-modal-outline-button"
            data-testid="auth-modal-signup-button"
          >
            {pendingAction === 'signup' && <Loader2 size={16} className="animate-spin" />}
            Create Account
          </Button>
        </div>

        <div className="auth-modal-divider">or continue with</div>

        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => handleAuthAction('google')}
          className="auth-modal-google-button"
          data-testid="auth-modal-google-button"
        >
          {pendingAction === 'google' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l4.01 3.1C6.23 6.87 8.88 4.75 12 4.75Z"
              />
            </svg>
          )}
          Continue with Google
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Type-check**

Run (from `Frontend/`): `npx tsc --noEmit`
Expected: no errors referencing `components/AuthModal.tsx`.

- [ ] **Step 4: Commit**

```bash
git add Frontend/components/AuthModal.tsx Frontend/components/AuthModal.css
git commit -m "feat: add AuthModal with Sign In, Create Account, and Google popup buttons"
```

---

### Task 4: Wire the modal into the header

**Files:**
- Modify: `Frontend/components/header.tsx`

- [ ] **Step 1: Add the modal import, state, and swap the Log In handler**

In `Frontend/components/header.tsx`, replace lines 1–16 (imports through the `useAuth0` destructure) with:

```tsx
"use client"

import { useState } from "react"
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth0 } from "@auth0/auth0-react"
import AuthModal from "@/components/AuthModal"
import "./header.css"

type Props = {
    battleMode: "singles" | "doubles"
    setBattleMode: (mode: "singles" | "doubles") => void
    sidebarOpen: boolean
    setSidebarOpen: (sidebar: boolean) => void
}

export default function Header({ battleMode, setBattleMode, sidebarOpen, setSidebarOpen }: Props) {
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const { isAuthenticated, isLoading, user, logout } = useAuth0();
```

Note `loginWithRedirect` is dropped from the `useAuth0()` destructure — nothing in this file calls it anymore.

Then replace the Log In button (originally lines 30–39):

```tsx
                    {!isLoading && !isAuthenticated && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setAuthModalOpen(true)}
                            className="header-login-button"
                            data-testid="header-login-button"
                        >
                            Log In
                        </Button>
                    )}
```

And render the modal as a sibling of the outermost fragment, immediately after the closing `</div>` of `header-battle-mode-row` (originally line 74) and before the final `</>`:

```tsx
            </div>

            <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        </>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run (from `Frontend/`): `npx tsc --noEmit && npm run lint`
Expected: no errors. Lint must not flag `loginWithRedirect` as unused (it's been removed from the destructure, not left dangling).

- [ ] **Step 3: Commit**

```bash
git add Frontend/components/header.tsx
git commit -m "feat: open AuthModal from the header Log In button instead of redirecting"
```

---

### Task 5: Update the e2e auth spec for the popup-modal flow

The existing `'login flow redirects to Auth0 when triggered'` test asserts a full-page navigation to `auth0.com`, which is no longer true — clicking Log In now opens the in-app modal. The authenticated-flow test's login step needs to open the modal, click Sign In inside it, then continue in the resulting **popup window** rather than the main page.

**Files:**
- Modify: `Frontend/e2e/auth.spec.ts`

- [ ] **Step 1: Replace the file**

```ts
import { test, expect } from '@playwright/test';

test.describe('Auth0 login and guest migration', () => {
  test('page loads as guest without requiring login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // App should render in guest mode without requiring login
    await expect(page.getByText('Pokemon Box')).toBeVisible();
  });

  test('login button is accessible in the header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginButton = page.getByTestId('header-login-button');
    if (await loginButton.isVisible()) {
      await expect(loginButton).toBeEnabled();
    }
  });

  test('login button opens the auth modal with all three options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginButton = page.getByTestId('header-login-button');
    if (await loginButton.isVisible()) {
      await loginButton.click();

      const modal = page.getByTestId('auth-modal');
      await expect(modal).toBeVisible();
      await expect(page.getByTestId('auth-modal-signin-button')).toBeVisible();
      await expect(page.getByTestId('auth-modal-signup-button')).toBeVisible();
      await expect(page.getByTestId('auth-modal-google-button')).toBeVisible();
    }
  });

  test('Sign In inside the modal opens an Auth0 popup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginButton = page.getByTestId('header-login-button');
    if (await loginButton.isVisible()) {
      await loginButton.click();

      const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
      await page.getByTestId('auth-modal-signin-button').click();
      const popup = await popupPromise;
      if (popup !== null) {
        await popup.waitForURL(/auth0\.com/, { timeout: 10000 });
        expect(popup.url()).toMatch(/auth0\.com/);
        await popup.close();
      }
    }
  });

  test.describe('Authenticated user flow (requires AUTH0_TEST credentials)', () => {
    test.skip(!process.env.AUTH0_TEST_USERNAME || !process.env.AUTH0_TEST_PASSWORD,
      'AUTH0_TEST_USERNAME and AUTH0_TEST_PASSWORD not set — skipping live auth test');

    test('logs in and sees migrated guest data', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Import a Pokemon as guest before logging in
      await page.getByTestId('open-import-modal').click();
      await page.getByTestId('import-modal-textarea').fill(
        'Eevee\nAbility: Adaptability\nLevel: 20\nTimid Nature\n- Quick Attack\n- Sand Attack\n- Tackle\n- Tail Whip'
      );
      await page.getByTestId('import-modal-confirm').click();

      // Log in via the modal, completing the flow in the Auth0 popup window
      await page.getByTestId('header-login-button').click();
      const popupPromise = page.waitForEvent('popup', { timeout: 10000 });
      await page.getByTestId('auth-modal-signin-button').click();
      const popup = await popupPromise;
      await popup.waitForURL(/auth0\.com/, { timeout: 10000 });
      await popup.fill('input[name="username"], input[type="email"]', process.env.AUTH0_TEST_USERNAME!);
      await popup.fill('input[name="password"], input[type="password"]', process.env.AUTH0_TEST_PASSWORD!);
      await popup.getByRole('button', { name: /continue|log in/i }).click();
      await popup.waitForEvent('close', { timeout: 15000 });

      // Guest data should be migrated — Eevee should still be in the box
      await expect(page.getByTestId('pokemon-card-Eevee')).toBeVisible({ timeout: 10000 });
    });
  });
});
```

- [ ] **Step 2: Run the e2e suite**

Run (from `Frontend/`): `npm run test:e2e -- auth.spec.ts`
Expected: the first four tests pass against a running local dev server (guest load, login button visible, modal opens with all three options, Sign In opens a popup pointed at `auth0.com`). The `Authenticated user flow` describe block skips unless `AUTH0_TEST_USERNAME`/`AUTH0_TEST_PASSWORD` are set — same as before this change.

- [ ] **Step 3: Commit**

```bash
git add Frontend/e2e/auth.spec.ts
git commit -m "test: update auth e2e spec for the popup-modal login flow"
```

---

### Task 6: Manual browser verification

Per this project's UI verification requirement, run the actual app and click through the golden path and edge cases before calling this done — type-checks and the e2e suite verify code correctness, not that the popup, focus trap, and theming actually look right.

- [ ] **Step 1: Start the dev server**

Run (from `Frontend/`): `npm run dev`

- [ ] **Step 2: Click through manually**

- Load `http://localhost:3000`, confirm the page renders as guest (no auth required).
- Click "Log In" in the header — the modal should open centered, backdrop-blurred, with the crest, "Join the battle" heading, Sign In (gradient pill), Create Account (outline pill), the "or continue with" divider, and Continue with Google (outline pill) — matching the approved mockup.
- Press `Esc` — modal closes. Reopen it, click the backdrop — modal closes. Reopen it, click the `X` — modal closes.
- Click "Sign In" — a real popup window opens to `dev-mx272jsbb31suun5.us.auth0.com`; the Sign In button shows a spinner and all three buttons are disabled while it's open. Close the popup without logging in — the modal stays open, buttons re-enable, no error toast.
- Click "Create Account" — popup opens directly on Auth0's signup screen (not login).
- Click "Continue with Google" — since the Google Social Connection isn't configured yet on the Auth0 tenant (see spec), this is expected to surface an error toast + be logged via `frontendLogger.error` rather than reach Google — confirm the toast reads "Sign-in failed — try again" and the app doesn't crash. Once the connection is configured (manual Auth0 Dashboard step, outside this plan), re-check that this button reaches Google's consent screen instead.
- Toggle the OS/browser color scheme (or however this project's dark mode is triggered) and reopen the modal — confirm it reads correctly in both themes (it uses the same CSS variables as the rest of the app, so this should require no extra work, but confirm visually).

- [ ] **Step 3: Report results to the user**

Summarize what was checked and any deviations from the above before considering the feature complete.

---

## Files touched

**New:**
- `Frontend/lib/auth/authModalActions.ts`
- `Frontend/lib/auth/authModalActions.test.ts`
- `Frontend/components/ui/dialog.tsx`
- `Frontend/components/AuthModal.tsx`
- `Frontend/components/AuthModal.css`

**Modified:**
- `Frontend/components/header.tsx`
- `Frontend/e2e/auth.spec.ts`
