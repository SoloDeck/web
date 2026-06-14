import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { useConfigStore } from "@/features/auth/hooks/useConfigStore";

/** Subset of the Google Identity Services API we rely on. */
interface GoogleCredentialResponse {
  credential?: string;
}
interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  prompt(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

// Official Google button dimensions — the skeleton matches these exactly to
// prevent layout shift (CLS) while the gsi/client script loads.
const BUTTON_WIDTH = 320;

/**
 * Google Identity Services sign-in button (Token Exchange Flow).
 *
 * Renders Google's official button, enables One Tap (`auto_select`), and on
 * callback exchanges the returned ID token for a SoloDesk session via the
 * store. A skeleton of identical size is shown until the SDK is ready.
 */
export function GoogleButton({ onDone }: { onDone: () => void }) {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const isGoogleSubmitting = useAuthStore((s) => s.isGoogleSubmitting);
  const config = useConfigStore((s) => s.config);
  const clientId = config?.google_web_client_id;

  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Keep the latest callbacks in refs so the SDK init effect runs once on mount
  // (onDone is a fresh closure each render).
  const onDoneRef = useRef(onDone);
  const loginRef = useRef(loginWithGoogle);
  const inFlightRef = useRef(false);

  // Sync the refs in an effect (not during render — react-hooks/refs).
  useEffect(() => {
    onDoneRef.current = onDone;
    loginRef.current = loginWithGoogle;
  });

  useEffect(() => {
    if (!clientId) {
      console.warn("Google Client ID is not ready or set — Google Sign-In disabled.");
      return;
    }

    let cancelled = false;

    const handleCredential = (response: GoogleCredentialResponse) => {
      if (inFlightRef.current) return; // guard against double dispatch
      if (!response.credential) {
        toast.error("Đăng nhập Google thất bại. Vui lòng thử lại.");
        return;
      }
      inFlightRef.current = true;
      loginRef
        .current(response.credential)
        .then(() => onDoneRef.current())
        .catch(() => {
          toast.error("Không thể xác thực với Google. Vui lòng thử lại.");
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    const tryInit = (): boolean => {
      const id = window.google?.accounts?.id;
      if (!id || !containerRef.current) return false;
      id.initialize({
        client_id: clientId,
        auto_select: true,
        callback: handleCredential,
      });
      id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: BUTTON_WIDTH,
        locale: "vi",
      });
      id.prompt(); // silent One Tap prompt
      return true;
    };

    if (tryInit()) {
      setReady(true);
      return;
    }
    // The gsi/client script may still be loading — poll until it is available.
    const timer = setInterval(() => {
      if (cancelled) return;
      if (tryInit()) {
        setReady(true);
        clearInterval(timer);
      }
    }, 100);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [clientId]);

  return (
    <div className="relative mx-auto h-11" style={{ width: BUTTON_WIDTH, maxWidth: "100%" }}>
      <div ref={containerRef} aria-label="Tiếp tục với Google" />
      {!ready && (
        <div
          data-testid="google-skeleton"
          aria-hidden
          className="absolute inset-0 h-11 animate-pulse rounded-md bg-muted"
        />
      )}
      {isGoogleSubmitting && (
        <div
          data-testid="google-submitting"
          className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70"
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
