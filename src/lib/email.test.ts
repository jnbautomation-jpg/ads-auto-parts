import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, sendEmail, shopRecipients } from "./email";
import { EMAIL } from "./site";

const MESSAGE = {
  to: ["shop@example.com"],
  subject: "Test",
  text: "Test",
  html: "<p>Test</p>",
};

describe("email transport", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // The whole contract of this module: it fails by returning, never by
  // throwing. Every caller runs after the real work is already committed.
  it("returns a failure instead of throwing when there is no key", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);
    await expect(sendEmail(MESSAGE)).resolves.toEqual({
      ok: false,
      reason: "unconfigured",
      error: "RESEND_API_KEY is not set",
    });
  });

  it("treats a blank key as unconfigured — an empty Vercel env var is not a key", async () => {
    vi.stubEnv("RESEND_API_KEY", "   ");
    const result = await sendEmail(MESSAGE);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unconfigured");
  });

  it("returns a failure instead of throwing when nobody is configured to receive it", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const result = await sendEmail({ ...MESSAGE, to: [] });
    expect(result).toEqual({
      ok: false,
      reason: "unconfigured",
      error: "no recipients configured",
    });
  });

  // `reason` is what lets a caller say "mail isn't set up" without naming the
  // provider's env var — see the module header.
  it("separates not-configured from genuinely-failed", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);
    const result = await sendEmail(MESSAGE);
    if (result.ok) throw new Error("expected a failure");
    expect(result.reason).toBe("unconfigured");
  });
});

describe("escapeHtml", () => {
  it("escapes every character that could break out of a text position", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("escapes the ampersand without double-escaping the entities it produces", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeHtml("2020 Kia K5 — Doors")).toBe("2020 Kia K5 — Doors");
  });
});

describe("shopRecipients", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the shop's own published address, so it works before anyone configures it", () => {
    vi.stubEnv("SHOP_EMAIL_TO", undefined);
    expect(shopRecipients()).toEqual([EMAIL]);
  });

  it("accepts a comma-separated list so marketing can be added without a code change", () => {
    vi.stubEnv("SHOP_EMAIL_TO", "shop@example.com, marketing@example.com");
    expect(shopRecipients()).toEqual(["shop@example.com", "marketing@example.com"]);
  });

  it("ignores empty entries from a trailing comma", () => {
    vi.stubEnv("SHOP_EMAIL_TO", "shop@example.com,");
    expect(shopRecipients()).toEqual(["shop@example.com"]);
  });
});
