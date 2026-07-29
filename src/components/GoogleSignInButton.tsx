import { useEffect, useRef } from 'react';
import { signInWithGoogleIdToken } from '@/lib/supabase';
import type { Language } from '@/lib/types';

// Minimal shape of the `google.accounts.id` API we use. The full type
// definitions live in @types/google.accounts, which isn't worth adding as a
// dependency just for this.
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: 'popup' | 'redirect';
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              logo_alignment?: 'left' | 'center';
              locale?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

// Set VITE_GOOGLE_CLIENT_ID in your .env — this is the OAuth 2.0 "Client ID"
// string from Google Cloud Console → APIs & Services → Credentials (the same
// client used in Supabase → Authentication → Providers → Google). It is
// public by design (it identifies the app, it's not a secret).
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInButtonProps {
  lang: Language;
}

export function GoogleSignInButton({ lang }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error(
        'VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file — see README/instructions for where to find it.',
      );
      return;
    }

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    function handleCredentialResponse(response: { credential: string }) {
      signInWithGoogleIdToken(response.credential).catch((err) => {
        console.error('Google sign-in failed:', err);
      });
    }

    function renderButton() {
      const google = window.google;
      if (cancelled || !containerRef.current || !google?.accounts?.id) return;

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID as string,
        callback: handleCredentialResponse,
        ux_mode: 'popup',
        auto_select: false,
      });

      containerRef.current.innerHTML = '';
      google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        locale: lang === 'tr' ? 'tr' : 'en',
      });
    }

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      // The GSI script is loaded with `async defer` in index.html, so it may
      // not be ready yet on first render — poll briefly until it is.
      pollId = setInterval(() => {
        if (window.google?.accounts?.id) {
          if (pollId) clearInterval(pollId);
          renderButton();
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, [lang]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return <div ref={containerRef} className="google-signin-button" />;
}
