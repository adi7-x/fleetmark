import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  auth,
  authFetch,
  errorMessage,
  getAccessToken,
  setAccessToken,
  isAuthenticated,
} from "./api";

describe("access token storage (H3: memory-only, never localStorage)", () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("holds the access token in memory, not in localStorage", () => {
    setAccessToken("abc.def.ghi");
    expect(getAccessToken()).toBe("abc.def.ghi");
    // The whole point of the H3 fix: nothing lands in localStorage.
    expect(localStorage.getItem("fleetmark_access")).toBeNull();
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("isAuthenticated reflects the in-memory token", () => {
    expect(isAuthenticated()).toBe(false);
    setAccessToken("tok");
    expect(isAuthenticated()).toBe(true);
    setAccessToken(null);
    expect(isAuthenticated()).toBe(false);
  });
});

describe("auth.completeLogin", () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
  });

  it("stores the access token in memory and caches the user", () => {
    const user = { id: "1", role: "STUDENT", login_42: "alice" };
    auth.completeLogin("access-token", user);

    expect(getAccessToken()).toBe("access-token");
    expect(localStorage.getItem("fleetmark_access")).toBeNull();
    expect(JSON.parse(localStorage.getItem("fleetmark_user"))).toEqual(user);
  });
});

describe("auth.restoreSession (cookie-based refresh on boot)", () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("does not call the backend at all when no session was ever cached", async () => {
    // A first-time visitor on the landing page has nothing to restore.
    // Asking anyway can only 401: it logs a console error on every public
    // page view and spends rate-limit budget for no possible gain.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = await auth.restoreSession();

    expect(user).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isAuthenticated()).toBe(false);
  });

  it("returns null and stays logged out when there is no valid refresh cookie", async () => {
    // A cached user says a session once existed, so the refresh is worth
    // trying — but the cookie is gone/expired, so the backend answers 401.
    localStorage.setItem("fleetmark_user", JSON.stringify({ id: "1" }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    );

    const user = await auth.restoreSession();
    expect(user).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it("recovers the session (new access token + profile) when refresh succeeds", async () => {
    localStorage.setItem("fleetmark_user", JSON.stringify({ id: "7" }));
    const profile = { id: "7", role: "LOGISTICS_STAFF", login_42: "boss" };
    const fetchMock = vi
      .fn()
      // 1) POST auth/token/refresh/ -> new access token
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access: "fresh-access" }) })
      // 2) GET auth/me/ -> profile
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => profile });
    vi.stubGlobal("fetch", fetchMock);

    const user = await auth.restoreSession();

    expect(user).toEqual(profile);
    expect(getAccessToken()).toBe("fresh-access");
    // The refresh request must send credentials so the HttpOnly cookie rides along.
    const [, refreshOpts] = fetchMock.mock.calls[0];
    expect(refreshOpts.credentials).toBe("include");
    expect(refreshOpts.method).toBe("POST");
  });
});

describe("auth.logout", () => {
  beforeEach(() => {
    setAccessToken("something");
    localStorage.setItem("fleetmark_user", JSON.stringify({ id: "1" }));
    vi.restoreAllMocks();
  });

  it("calls the backend logout with credentials and clears local state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await auth.logout();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("auth/logout/");
    expect(opts.credentials).toBe("include");
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("fleetmark_user")).toBeNull();
  });

  it("still clears local state even if the logout request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await auth.logout();

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("fleetmark_user")).toBeNull();
  });
});

describe("authFetch (pages calling fetch directly)", () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends the current token even if the caller passed a stale one", async () => {
    setAccessToken("fresh");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await authFetch("/api/v1/x/", { headers: { Authorization: "Bearer stale" } });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer fresh");
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    setAccessToken("expired");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: "renewed" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await authFetch("/api/v1/x/");
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[1][0]).toContain("auth/token/refresh/");
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer renewed");
  });
});

describe("errorMessage", () => {
  it("prefers DRF detail, then the first field error, then the fallback", async () => {
    expect(await errorMessage(new Response(JSON.stringify({ detail: "Nope." })), "x")).toBe("Nope.");
    expect(await errorMessage(new Response(JSON.stringify({ name: ["Taken."] })), "x")).toBe("Taken.");
    expect(await errorMessage(new Response("not json"), "fallback")).toBe("fallback");
  });
});

describe("server messages are localised", () => {
  it("translates a known backend message into French", async () => {
    localStorage.setItem("fleetmark_lang", "fr");
    const res = new Response(JSON.stringify({ detail: "You already have a reservation for this day." }));
    expect(await errorMessage(res, "x")).toBe("Vous avez déjà une place réservée pour cette nuit.");
    localStorage.clear();
  });
});

describe("refresh failures that are not 401", () => {
  it("does not sign the user out when the refresh endpoint is rate-limited", async () => {
    setAccessToken("expired");
    localStorage.setItem("fleetmark_user", JSON.stringify({ id: "1" }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await authFetch("/api/v1/x/");
    expect(res.status).toBe(401);
    expect(localStorage.getItem("fleetmark_user")).not.toBeNull();
    localStorage.clear();
  });
});
