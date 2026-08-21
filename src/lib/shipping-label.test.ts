import { describe, expect, it } from "vitest";
import { buildLabelData, wrapText, type LabelOrder } from "./shipping-label";

const order = (over: Partial<LabelOrder> = {}): LabelOrder => ({
  orderNumber: 1042,
  customerName: "Rivera Collision",
  customerPhone: "(407) 555-0142",
  fulfillment: "DELIVERY",
  deliveryAddress: "1200 Sample Rd, Orlando, FL 32807",
  notes: null,
  items: [
    { sku: "RAV4-19-24-DR-LF", description: "2019-2024 Toyota RAV4 DOOR", quantity: 2 },
  ],
  ...over,
});

describe("wrapText", () => {
  it("wraps on word boundaries", () => {
    expect(wrapText("one two three four", 9)).toEqual(["one two", "three", "four"]);
  });

  it("breaks a single word longer than the line rather than overflowing", () => {
    // A label that runs off the edge is a label the driver can't read.
    expect(wrapText("ABCDEFGHIJ", 4)).toEqual(["ABCD", "EFGH", "IJ"]);
  });

  it("handles empty input", () => {
    expect(wrapText("", 10)).toEqual([]);
  });
});

describe("buildLabelData", () => {
  it("labels a delivery with the address", () => {
    const data = buildLabelData(order());
    expect(data.title).toBe("DELIVERY");
    expect(data.reference).toBe("ADS-1042");
    expect(data.recipientLines.join(" ")).toContain("1200 Sample Rd");
    expect(data.warnings).toEqual([]);
  });

  it("warns loudly when a delivery has no address", () => {
    // Printing a delivery label with no address is how a package gets loaded
    // onto a van and comes back at the end of the day.
    const data = buildLabelData(order({ deliveryAddress: null }));
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings[0]).toMatch(/NO DELIVERY ADDRESS/);
  });

  it("treats a blank address as missing, not as an address", () => {
    expect(buildLabelData(order({ deliveryAddress: "   " })).warnings).toHaveLength(1);
  });

  it("omits the address entirely for a collection", () => {
    // A pickup label is a shelf tag, not a shipment.
    const data = buildLabelData(order({ fulfillment: "PICKUP", deliveryAddress: null }));
    expect(data.title).toBe("COLLECTION");
    expect(data.isPickup).toBe(true);
    expect(data.warnings).toEqual([]);
    expect(data.recipientLines).toEqual(["Rivera Collision", "(407) 555-0142"]);
  });

  it("counts total pieces across lines, not lines", () => {
    // The driver needs to know how many physical panels to load.
    const data = buildLabelData(
      order({
        items: [
          { sku: "A", description: "Door", quantity: 2 },
          { sku: "B", description: "Hood", quantity: 3 },
        ],
      }),
    );
    expect(data.totalPieces).toBe(5);
  });

  it("lists every item with quantity and sku", () => {
    const data = buildLabelData(order());
    expect(data.itemLines.join(" ")).toContain("2x");
    expect(data.itemLines.join(" ")).toContain("RAV4-19-24-DR-LF");
  });

  it("wraps a long address rather than letting it run off the label", () => {
    const data = buildLabelData(
      order({ deliveryAddress: "Suite 4100, 12000 Very Long Boulevard Name, Winter Park, FL 32789" }),
    );
    for (const l of data.recipientLines) expect(l.length).toBeLessThanOrEqual(32);
  });
});
