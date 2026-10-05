import React, { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module caches the OAuth fragment at module scope (deliberately — see
// consumeOAuthFragment), so every case needs a fresh copy of the module.
async function loadAuthCallback() {
  vi.resetModules();
  // Import the provider from the same fresh module graph, or the context
  // object would differ and useTranslation() would throw.
  const { TranslationProvider } = await import("../context/TranslationContext");
  const AuthCallback = (await import("./AuthCallback")).default;
  return function WithTranslation() {
    return (
      <TranslationProvider>
        <AuthCallback />
      </TranslationProvider>
    );
  };
}

const ADMIN_PROFILE = {
  id: "u-1",
  login_42: "aabourji",
  email: "aabourji@student.1337.ma",
  role: "LOGISTICS_STAFF",
  station: null,
};

let replaceSpy;
let historySpy;

beforeEach(() => {
  replaceSpy = vi.fn();
  // jsdom's window.location is not writable; swap in a stub that records
  // where the component tried to send the browser.
  delete window.location;
  window.location = {
    hash: "",
    pathname: "/auth/callback",
    replace: replaceSpy,
  };
  // A real browser drops the fragment from window.location.hash when
  // history.replaceState() rewrites the URL without one. The stub above
  // would otherwise keep serving the hash forever and hide the very bug
  // these tests exist to catch.
  historySpy = vi
    .spyOn(window.history, "replaceState")
    .mockImplementation((_state, _title, url) => {
      if (typeof url === "string" && !url.includes("#")) window.location.hash = "";
    });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AuthCallback", () => {
  it("completes login under StrictMode's double-mounted effect", async () => {
    // This is the regression: StrictMode mounts, unmounts and remounts the
    // effect. The fragment is stripped from the URL on first read, so a
    // second read that goes back to window.location.hash sees nothing and
    // bounces a valid login to /?auth_error=provider.
    window.location.hash =
      "#access=jwt-access-token&role=LOGISTICS_STAFF&login=aabourji&totp=0";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ADMIN_PROFILE,
    });
    vi.stubGlobal("fetch", fetchMock);

    const AuthCallback = await loadAuthCallback();
    render(
      <StrictMode>
        <AuthCallback />
      </StrictMode>
    );

    await waitFor(() => expect(replaceSpy).toHaveBeenCalled());

    expect(replaceSpy).toHaveBeenCalledWith("/admin");
    expect(replaceSpy).not.toHaveBeenCalledWith("/?auth_error=provider");

    // The access token reached the profile call, and the refresh cookie is
    // sent along with it.
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer jwt-access-token");
    expect(init.credentials).toBe("include");

    // Session is established for the reload that follows the redirect.
    expect(JSON.parse(localStorage.getItem("fleetmark_user")).role).toBe(
      "LOGISTICS_STAFF"
    );
  });

  it("strips the access token from the URL so it cannot leak", async () => {
    window.location.hash = "#access=jwt-access-token&role=STUDENT&totp=0";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...ADMIN_PROFILE, role: "STUDENT", station: "s-1" }),
      })
    );

    const AuthCallback = await loadAuthCallback();
    render(<AuthCallback />);

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith("/passenger"));
    expect(historySpy).toHaveBeenCalledWith({}, "", "/auth/callback");
  });

  it("sends a station-less student to onboarding", async () => {
    window.location.hash = "#access=jwt-access-token&role=STUDENT&totp=0";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...ADMIN_PROFILE, role: "STUDENT", station: null }),
      })
    );

    const AuthCallback = await loadAuthCallback();
    render(<AuthCallback />);

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith("/onboarding"));
  });

  it("prompts for a TOTP code instead of logging in when 2FA is on", async () => {
    window.location.hash = "#preauth=preauth-token&totp=1";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const AuthCallback = await loadAuthCallback();
    const { findByText } = render(
      <StrictMode>
        <AuthCallback />
      </StrictMode>
    );

    expect(await findByText("Two-factor authentication")).toBeInTheDocument();
    // No session may be minted before the code is verified.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem("fleetmark_user")).toBeNull();
  });

  it("fails closed when the callback carries no payload at all", async () => {
    window.location.hash = "";
    vi.stubGlobal("fetch", vi.fn());

    const AuthCallback = await loadAuthCallback();
    render(<AuthCallback />);

    await waitFor(() =>
      expect(replaceSpy).toHaveBeenCalledWith("/?auth_error=provider")
    );
  });

  it("fails closed when the profile lookup is rejected", async () => {
    window.location.hash = "#access=stale-token&role=STUDENT&totp=0";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    );

    const AuthCallback = await loadAuthCallback();
    render(<AuthCallback />);

    await waitFor(() =>
      expect(replaceSpy).toHaveBeenCalledWith("/?auth_error=provider")
    );
    expect(localStorage.getItem("fleetmark_user")).toBeNull();
  });
});
