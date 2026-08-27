import { afterEach, describe, expect, it } from "vitest";
import { isEmailConfigured, sendEmail } from "./email";

const MESSAGE = {
  to: ["shop@example.com"],
  subject: "Test",
  text: "Test",
  html: "<p>Test</p>",
};

describe("email transport", () => {
  const original = process.env.RESEND_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = original;
  });

  it("reports itself unconfigured with no key, so callers can say so in the logs", () => {
    delete process.env.RESEND_API_KEY;
    expect(isEmailConfigured()).toBe(false);
  });

  it("treats a blank key as unconfigured — an empty Vercel env var is not a key", () => {
    process.env.RESEND_API_KEY = "   ";
    expect(isEmailConfigured()).toBe(false);
  });

  // The whole contract of this module: it fails by returning, never by
  // throwing. Every caller runs after the real work is already committed.
  it("returns a failure instead of throwing when there is no key", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmail(MESSAGE)).resolves.toEqual({
      ok: false,
      error: "RESEND_API_KEY is not set",
    });
  });

  it("returns a failure instead of throwing when nobody is configured to receive it", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const result = await sendEmail({ ...MESSAGE, to: [] });
    expect(result).toEqual({ ok: false, error: "no recipients configured" });
  });
});
