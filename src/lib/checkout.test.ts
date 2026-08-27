import { describe, expect, it } from "vitest";
import {
  CHECKOUT_LIMITS,
  formatDeliveryAddress,
  isFulfillment,
  validateCheckoutInput,
} from "./checkout";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";

const PICKUP = {
  name: "Jane Doe",
  phone: "(407) 555-0142",
  email: "jane@example.com",
  fulfillment: "PICKUP",
  deliveryAddress: "",
  deliveryZip: "",
  notes: "",
};

const DELIVERY = {
  ...PICKUP,
  fulfillment: "DELIVERY",
  deliveryAddress: "123 Main St, Orlando",
  deliveryZip: "32807",
};

describe("validateCheckoutInput", () => {
  it("accepts a complete pickup order", () => {
    expect(validateCheckoutInput(PICKUP).ok).toBe(true);
  });

  it("accepts a complete delivery order", () => {
    expect(validateCheckoutInput(DELIVERY).ok).toBe(true);
  });

  it("trims every field", () => {
    const result = validateCheckoutInput({ ...PICKUP, name: "  Jane Doe  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Jane Doe");
  });

  it("requires a name and says which field is wrong", () => {
    const result = validateCheckoutInput({ ...PICKUP, name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(en.checkout.errors.nameRequired);
      expect(result.field).toBe("name");
    }
  });

  it("requires a phone number", () => {
    const result = validateCheckoutInput({ ...PICKUP, phone: "" });
    if (result.ok) throw new Error("expected a rejection");
    expect(result.field).toBe("phone");
  });

  it("rejects a phone number too short to call", () => {
    const result = validateCheckoutInput({ ...PICKUP, phone: "12" });
    if (result.ok) throw new Error("expected a rejection");
    expect(result.error).toBe(en.errors.phoneInvalid);
  });

  // Unlike the quote form, where email is optional: someone who has just paid
  // has to be able to receive a receipt.
  it("requires an email address, which the quote form does not", () => {
    const result = validateCheckoutInput({ ...PICKUP, email: "" });
    if (result.ok) throw new Error("expected a rejection");
    expect(result.error).toBe(en.checkout.errors.emailRequired);
    expect(result.field).toBe("email");
  });

  it("rejects a malformed email", () => {
    const result = validateCheckoutInput({ ...PICKUP, email: "jane@" });
    if (result.ok) throw new Error("expected a rejection");
    expect(result.error).toBe(en.errors.emailInvalid);
  });

  it("answers in the language the customer is using", () => {
    const result = validateCheckoutInput({ ...PICKUP, name: "" }, "es");
    if (result.ok) throw new Error("expected a rejection");
    expect(result.error).toBe(es.checkout.errors.nameRequired);
  });

  it("rejects over-length input rather than silently truncating it", () => {
    const result = validateCheckoutInput({
      ...PICKUP,
      name: "x".repeat(CHECKOUT_LIMITS.name + 1),
    });
    if (result.ok) throw new Error("expected a rejection");
    expect(result.error).toContain(en.checkout.fields.name);
  });

  describe("delivery", () => {
    it("requires an address", () => {
      const result = validateCheckoutInput({ ...DELIVERY, deliveryAddress: "" });
      if (result.ok) throw new Error("expected a rejection");
      expect(result.field).toBe("deliveryAddress");
    });

    it("rejects a malformed ZIP", () => {
      const result = validateCheckoutInput({ ...DELIVERY, deliveryZip: "123" });
      if (result.ok) throw new Error("expected a rejection");
      expect(result.error).toBe(en.checkout.errors.zipInvalid);
    });

    // Well-formed but nowhere near Orlando. Accepting it would take payment
    // for a delivery at no delivery charge, into a zone whose fee is still
    // one of Matthew's open decisions.
    it("refuses a delivery to a ZIP outside the served zones", () => {
      const result = validateCheckoutInput({ ...DELIVERY, deliveryZip: "90210" });
      if (result.ok) throw new Error("expected a rejection");
      expect(result.error).toBe(en.checkout.errors.zipOutside);
      expect(result.field).toBe("deliveryZip");
    });

    it("accepts a Central Florida ZIP", () => {
      expect(validateCheckoutInput({ ...DELIVERY, deliveryZip: "32807" }).ok).toBe(true);
    });

    it("does not ask a pickup order for an address", () => {
      expect(validateCheckoutInput({ ...PICKUP, deliveryAddress: "", deliveryZip: "" }).ok).toBe(
        true,
      );
    });
  });

  // The form is unauthenticated, so the fulfillment field is as forgeable as
  // anything else. Pickup is the value that cannot go wrong: nothing gets
  // shipped anywhere on the strength of a tampered field.
  it("falls back to pickup for an unrecognised fulfillment rather than failing", () => {
    const result = validateCheckoutInput({ ...PICKUP, fulfillment: "TELEPORT" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.fulfillment).toBe("PICKUP");
  });

  it("does not let a tampered fulfillment smuggle in an unchecked address", () => {
    const result = validateCheckoutInput({
      ...PICKUP,
      fulfillment: "delivery",
      deliveryAddress: "somewhere",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(formatDeliveryAddress(result.value)).toBeNull();
  });
});

describe("isFulfillment", () => {
  it("accepts only the two real values", () => {
    expect(isFulfillment("PICKUP")).toBe(true);
    expect(isFulfillment("DELIVERY")).toBe(true);
    expect(isFulfillment("pickup")).toBe(false);
    expect(isFulfillment("")).toBe(false);
  });
});

describe("formatDeliveryAddress", () => {
  it("folds the ZIP into the single address the warehouse reads", () => {
    const result = validateCheckoutInput(DELIVERY);
    if (!result.ok) throw new Error("expected valid input");
    expect(formatDeliveryAddress(result.value)).toBe("123 Main St, Orlando, 32807");
  });

  it("is null for a pickup order, so no address is stored against one", () => {
    const result = validateCheckoutInput(PICKUP);
    if (!result.ok) throw new Error("expected valid input");
    expect(formatDeliveryAddress(result.value)).toBeNull();
  });
});
