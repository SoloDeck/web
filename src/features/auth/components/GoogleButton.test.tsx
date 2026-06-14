import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { GoogleButton } from "./GoogleButton";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/features/auth/hooks/useAuthStore", () => ({ useAuthStore: vi.fn() }));

type GoogleCb = (r: { credential?: string }) => void;

interface StoreState {
  loginWithGoogle: (credential: string) => Promise<void>;
  isGoogleSubmitting: boolean;
}

function mockStore(state: StoreState): void {
  // The component only reads loginWithGoogle + isGoogleSubmitting; cast the
  // partial state to satisfy the real selector signature.
  vi.mocked(useAuthStore).mockImplementation((selector) => selector(state as never));
}

function installGoogle() {
  const initialize = vi.fn();
  const renderButton = vi.fn();
  const prompt = vi.fn();
  (window as unknown as { google: unknown }).google = {
    accounts: { id: { initialize, renderButton, prompt } },
  };
  return { initialize, renderButton, prompt };
}

/** Pull the credential callback the component registered via initialize(). */
function capturedCallback(initialize: ReturnType<typeof vi.fn>): GoogleCb {
  return initialize.mock.calls[0][0].callback as GoogleCb;
}

beforeEach(() => {
  vi.stubEnv("VITE_GOOGLE_WEB_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  delete (window as unknown as { google?: unknown }).google;
});

describe("<GoogleButton />", () => {
  it("shows a same-size skeleton while the SDK is not yet available", () => {
    mockStore({ loginWithGoogle: vi.fn(), isGoogleSubmitting: false });
    render(<GoogleButton onDone={vi.fn()} />);
    expect(screen.getByTestId("google-skeleton")).toBeInTheDocument();
  });

  it("initializes GIS with One Tap and renders the official button when the SDK is ready", async () => {
    mockStore({ loginWithGoogle: vi.fn(), isGoogleSubmitting: false });
    const g = installGoogle();
    render(<GoogleButton onDone={vi.fn()} />);

    await waitFor(() => expect(g.renderButton).toHaveBeenCalledTimes(1));
    expect(g.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "test-client-id.apps.googleusercontent.com",
        auto_select: true,
      }),
    );
    expect(g.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("google-skeleton")).not.toBeInTheDocument();
  });

  it("waits for the gsi/client script to load, then renders the button", async () => {
    vi.useFakeTimers();
    try {
      mockStore({ loginWithGoogle: vi.fn(), isGoogleSubmitting: false });
      render(<GoogleButton onDone={vi.fn()} />);
      expect(screen.getByTestId("google-skeleton")).toBeInTheDocument();

      const g = installGoogle();
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(g.renderButton).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("google-skeleton")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("exchanges the credential and calls onDone on success", async () => {
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined);
    const onDone = vi.fn();
    mockStore({ loginWithGoogle, isGoogleSubmitting: false });
    const g = installGoogle();
    render(<GoogleButton onDone={onDone} />);

    await waitFor(() => expect(g.initialize).toHaveBeenCalled());
    await act(async () => capturedCallback(g.initialize)({ credential: "google-id-token" }));

    expect(loginWithGoogle).toHaveBeenCalledWith("google-id-token");
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("shows an error toast and does not dispatch when no credential is returned", async () => {
    const loginWithGoogle = vi.fn();
    mockStore({ loginWithGoogle, isGoogleSubmitting: false });
    const g = installGoogle();
    render(<GoogleButton onDone={vi.fn()} />);

    await waitFor(() => expect(g.initialize).toHaveBeenCalled());
    await act(async () => capturedCallback(g.initialize)({}));

    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("surfaces a Vietnamese error toast when the exchange fails", async () => {
    const loginWithGoogle = vi.fn().mockRejectedValue(new Error("boom"));
    mockStore({ loginWithGoogle, isGoogleSubmitting: false });
    const g = installGoogle();
    render(<GoogleButton onDone={vi.fn()} />);

    await waitFor(() => expect(g.initialize).toHaveBeenCalled());
    await act(async () => capturedCallback(g.initialize)({ credential: "tok" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("shows a submitting spinner overlay (blocks double dispatch) while in flight", () => {
    mockStore({ loginWithGoogle: vi.fn(), isGoogleSubmitting: true });
    installGoogle();
    render(<GoogleButton onDone={vi.fn()} />);
    expect(screen.getByTestId("google-submitting")).toBeInTheDocument();
  });
});
