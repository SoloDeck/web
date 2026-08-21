import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initGoogleAnalytics } from "./ga";

function gtagScripts(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll<HTMLScriptElement>("script#ga4-gtag")];
}

describe("initGoogleAnalytics", () => {
  beforeEach(() => {
    for (const script of gtagScripts()) script.remove();
    delete window.dataLayer;
    delete window.gtag;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("không nạp gì khi thiếu VITE_GA_MEASUREMENT_ID", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");

    initGoogleAnalytics();

    expect(gtagScripts()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
  });

  it("nạp gtag.js và khởi tạo khi có ID", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST12345");

    initGoogleAnalytics();

    const [script] = gtagScripts();
    expect(script.src).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST12345");
    expect(script.async).toBe(true);
    expect(window.dataLayer).toHaveLength(2);
  });

  it("gọi lại không nạp script lần hai (StrictMode dựng cây hai lượt)", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST12345");

    initGoogleAnalytics();
    initGoogleAnalytics();

    expect(gtagScripts()).toHaveLength(1);
  });
});
