import { describe, expect, it } from "vitest";
import { buildLeadEmail, type Lead } from "./lead-email";

// A lead with everything filled in. Individual tests strip fields back down.
const LEAD: Lead = {
  id: "clead000000000000000000",
  name: "Jane Doe",
  phone: "(407) 743-4644",
  email: "jane@example.com",
  vehicle: "2020 Kia K5",
  partNeeded: "Doors",
  notes: "Left front, silver. Need it this week.",
  locale: "en",
  product: null,
  // Deliberately mid-afternoon Orlando time expressed in UTC: 2:30 PM EDT.
  receivedAt: new Date("2026-08-27T18:30:00Z"),
};

describe("buildLeadEmail — subject", () => {
  it("leads with the vehicle and part, because that is what the shop triages on", () => {
    expect(buildLeadEmail(LEAD).subject).toBe("New quote request: 2020 Kia K5 — Doors (Jane Doe)");
  });

  it("falls back to the name when neither vehicle nor part was given", () => {
    const subject = buildLeadEmail({ ...LEAD, vehicle: null, partNeeded: null }).subject;
    expect(subject).toBe("New quote request: Jane Doe");
  });

  it("tags a translated lead with its language, so it is triaged before it is opened", () => {
    expect(buildLeadEmail({ ...LEAD, locale: "es" }).subject).toMatch(/^\[ES\] /);
  });

  it("does not flag an English lead", () => {
    expect(buildLeadEmail(LEAD).subject).not.toContain("[ES]");
  });

  it("collapses newlines out of the subject, so a crafted name cannot restructure it", () => {
    const { subject } = buildLeadEmail({ ...LEAD, name: "Jane\r\nBcc: attacker@example.com" });
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe("buildLeadEmail — body", () => {
  it("carries every field the shop needs to call the customer back", () => {
    const { text } = buildLeadEmail(LEAD);
    expect(text).toContain("Jane Doe");
    expect(text).toContain("(407) 743-4644");
    expect(text).toContain("jane@example.com");
    expect(text).toContain("2020 Kia K5");
    expect(text).toContain("Doors");
    expect(text).toContain("Left front, silver.");
  });

  it("sends both a text and an HTML part", () => {
    const { text, html } = buildLeadEmail(LEAD);
    expect(text.length).toBeGreaterThan(0);
    expect(html).toContain("<div");
  });

  it("says a field is missing rather than leaving a blank the reader has to interpret", () => {
    const { text } = buildLeadEmail({ ...LEAD, email: null, vehicle: null });
    expect(text).toContain("Email: — not given —");
    expect(text).toContain("Vehicle: — not given —");
  });

  it("tells staff to call back when no email was given", () => {
    const { text, html } = buildLeadEmail({ ...LEAD, email: null });
    expect(text).toContain("No email given — call back on (407) 743-4644.");
    // Both parts close the same way — they read from one string, so they
    // cannot drift into saying different things.
    expect(html).toContain("No email given — call back on (407) 743-4644.");
  });

  it("tells staff to reply directly when an email was given", () => {
    expect(buildLeadEmail(LEAD).text).toContain("Reply to this email");
  });

  it("stamps the time in Orlando's zone, not the function's UTC", () => {
    // 18:30 UTC is 2:30 PM in Orlando during August. Formatted in UTC it
    // would read 6:30 PM and look like an after-hours lead.
    expect(buildLeadEmail(LEAD).text).toContain("2:30 PM");
  });

  it("names the listing when the request came from a product page", () => {
    const { text } = buildLeadEmail({
      ...LEAD,
      product: {
        sku: "ACC-18-DR-L",
        make: "Honda",
        model: "Accord",
        yearStart: 2018,
        yearEnd: 2020,
        partType: "DOOR",
        position: "FRONT_LEFT",
      },
    });
    expect(text).toContain("ACC-18-DR-L — 2018–2020 Honda Accord, Door (Left Front)");
  });

  it("omits the position rather than printing the em-dash placeholder mid-sentence", () => {
    const { text } = buildLeadEmail({
      ...LEAD,
      product: {
        sku: "ACC-18-HD",
        make: "Honda",
        model: "Accord",
        yearStart: 2018,
        yearEnd: 2018,
        partType: "HOOD",
        position: null,
      },
    });
    expect(text).toContain("ACC-18-HD — 2018 Honda Accord, Hood");
    expect(text).not.toContain("Hood (—)");
  });

  it("names the customer's language rather than assuming a two-language world", () => {
    const { text } = buildLeadEmail({ ...LEAD, locale: "es" });
    expect(text).toContain("Language: Español — reply in this language");
  });

  it("says nothing about language on a lead in the site's own language", () => {
    expect(buildLeadEmail(LEAD).text).not.toContain("Language:");
  });

  it("links back to the admin inquiries list", () => {
    expect(buildLeadEmail(LEAD).text).toContain("/inquiries");
  });
});

describe("buildLeadEmail — escaping", () => {
  // Everything in a lead is free text from an unauthenticated public form.
  // It passes length and shape validation and nothing else.
  it("escapes HTML in every field it renders", () => {
    const { html } = buildLeadEmail({
      ...LEAD,
      name: '<script>alert("x")</script>',
      notes: "<img src=x onerror=alert(1)>",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes the notes block even though it preserves line breaks", () => {
    const { html } = buildLeadEmail({ ...LEAD, notes: "line one\n<b>line two</b>" });
    expect(html).toContain("&lt;b&gt;line two&lt;/b&gt;");
  });

  it("strips non-digits out of the tel: href", () => {
    expect(buildLeadEmail(LEAD).html).toContain('href="tel:4077434644"');
  });

  it("links an email that was given", () => {
    expect(buildLeadEmail(LEAD).html).toContain('href="mailto:jane@example.com"');
  });

  // The placeholder is applied when the row renders, not baked into the row's
  // value, so there is no way for it to end up inside a mailto:.
  it("never turns the missing-value placeholder into a link", () => {
    const { html } = buildLeadEmail({ ...LEAD, email: null });
    expect(html).not.toContain("mailto:—");
    expect(html).not.toContain("mailto:&#");
  });
});
