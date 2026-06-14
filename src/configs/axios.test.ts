import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import axiosClient from "./axios";

const SESSION_KEY = "solodesk.auth.session.v1";
const REFRESH_KEY = "solodesk.auth.refresh.v1";

const realAdapter = axiosClient.defaults.adapter;
const realLocation = window.location;

/** Records every outbound request URL so we can assert what the interceptor did. */
let calls: string[] = [];

function ok(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config });
}

function fail(config: InternalAxiosRequestConfig, status: number) {
  const response = { data: {}, status, statusText: "", headers: {}, config };
  return Promise.reject(new AxiosError("Request failed", String(status), config, null, response));
}

function useAdapter(handler: (config: InternalAxiosRequestConfig, url: string) => Promise<unknown>) {
  axiosClient.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";
    calls.push(url);
    return handler(config, url);
  }) as AxiosAdapter;
}

beforeEach(() => {
  calls = [];
  localStorage.clear();
  sessionStorage.clear();
  // jsdom logs/throws on real navigation; swap in a settable stub so we can
  // assert whether the interceptor tried to redirect.
  Object.defineProperty(window, "location", { writable: true, value: { href: "" } });
});

afterEach(() => {
  axiosClient.defaults.adapter = realAdapter;
  Object.defineProperty(window, "location", { writable: true, value: realLocation });
});

describe("axios refresh interceptor — auth endpoints are exempt", () => {
  it("rejects a 401 from /auth/login without attempting a token refresh", async () => {
    useAdapter((config) => fail(config, 401));

    await expect(axiosClient.post("/auth/login", { email: "a@b.com", password: "x" })).rejects.toMatchObject({
      response: { status: 401 },
    });

    // The whole point of the fix: no self-referential /auth/refresh, no deadlock.
    expect(calls).toEqual(["/auth/login"]);
    expect(window.location.href).toBe("");
  });

  it("does not refresh or redirect when /auth/login 401s while a stale refresh token sits in storage", async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: "stale-access" }));
    localStorage.setItem(REFRESH_KEY, "stale-refresh");
    useAdapter((config) => fail(config, 401));

    await expect(axiosClient.post("/auth/login", {})).rejects.toBeInstanceOf(AxiosError);

    expect(calls).not.toContain("/auth/refresh");
    expect(window.location.href).toBe("");
  });

  it("rejects a 401 from /auth/refresh itself without re-entering the refresh flow", async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: "stale-access" }));
    localStorage.setItem(REFRESH_KEY, "stale-refresh");
    useAdapter((config) => fail(config, 401));

    // If /auth/refresh were not exempt it would queue itself and hang forever;
    // this resolving (rejecting) at all is the regression guard.
    await expect(axiosClient.post("/auth/refresh", { refresh_token: "stale-refresh" })).rejects.toBeInstanceOf(
      AxiosError,
    );
    expect(calls).toEqual(["/auth/refresh"]);
  });
});

describe("axios refresh interceptor — non-auth endpoints still refresh", () => {
  it("refreshes once and retries the original request on a 401 from a protected endpoint", async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: "old-access" }));
    localStorage.setItem(REFRESH_KEY, "valid-refresh");

    let usersMeHits = 0;
    useAdapter((config, url) => {
      if (url === "/users/me") {
        usersMeHits += 1;
        return usersMeHits === 1 ? fail(config, 401) : ok(config, { data: { id: "1" } });
      }
      if (url === "/auth/refresh") {
        return ok(config, { data: { access_token: "new-access", refresh_token: "new-refresh" } });
      }
      return fail(config, 404);
    });

    const res = await axiosClient.get<{ data: { id: string } }>("/users/me");

    expect(res.data).toEqual({ data: { id: "1" } });
    expect(calls.filter((u) => u === "/auth/refresh")).toHaveLength(1);
    expect(usersMeHits).toBe(2); // original 401 + one retry
    expect(localStorage.getItem(REFRESH_KEY)).toBe("new-refresh");
  });
});

