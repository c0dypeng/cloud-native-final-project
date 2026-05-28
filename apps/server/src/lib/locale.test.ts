import { describe, it, expect } from "vitest";
import { normalizeLocale, getRequestLocale } from "./locale.js";

function fakeReq(overrides: {
  query?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}) {
  const headers = overrides.headers ?? {};
  const cookies = overrides.cookies ?? {};
  return {
    query: overrides.query ?? {},
    get(name: string) {
      return headers[name.toLowerCase()];
    },
    cookies,
  } as unknown as import("express").Request;
}

describe("normalizeLocale", () => {
  it("maps 'en' to 'en'", () => {
    expect(normalizeLocale("en")).toBe("en");
  });

  it("maps 'en-US' to 'en'", () => {
    expect(normalizeLocale("en-US")).toBe("en");
  });

  it("maps 'ja' to 'ja'", () => {
    expect(normalizeLocale("ja")).toBe("ja");
  });

  it("maps 'ja-JP' to 'ja'", () => {
    expect(normalizeLocale("ja-JP")).toBe("ja");
  });

  it("maps 'zh-TW' to 'zh-TW'", () => {
    expect(normalizeLocale("zh-TW")).toBe("zh-TW");
  });

  it("maps 'zh' to 'zh-TW'", () => {
    expect(normalizeLocale("zh")).toBe("zh-TW");
  });

  it("falls back to 'zh-TW' for unsupported locale", () => {
    expect(normalizeLocale("fr")).toBe("zh-TW");
  });

  it("falls back to 'zh-TW' for null", () => {
    expect(normalizeLocale(null)).toBe("zh-TW");
  });

  it("falls back to 'zh-TW' for non-string", () => {
    expect(normalizeLocale(123)).toBe("zh-TW");
  });
});

describe("getRequestLocale", () => {
  it("prefers query param over header", () => {
    const req = fakeReq({
      query: { locale: "en" },
      headers: { "x-locale": "ja" },
    });
    expect(getRequestLocale(req)).toBe("en");
  });

  it("uses x-locale header when no query param", () => {
    const req = fakeReq({ headers: { "x-locale": "ja" } });
    expect(getRequestLocale(req)).toBe("ja");
  });

  it("falls back to cookie when no query or header", () => {
    const req = fakeReq({ cookies: { "huyouan-locale": "en" } });
    expect(getRequestLocale(req)).toBe("en");
  });

  it("falls back to accept-language header", () => {
    const req = fakeReq({ headers: { "accept-language": "ja-JP,ja;q=0.9" } });
    expect(getRequestLocale(req)).toBe("ja");
  });

  it("returns zh-TW when nothing is set", () => {
    const req = fakeReq();
    expect(getRequestLocale(req)).toBe("zh-TW");
  });
});
