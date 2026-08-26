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
