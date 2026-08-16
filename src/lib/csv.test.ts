import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses a simple grid", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps empty fields as empty strings", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });

  it("handles a quoted field containing a comma", () => {
    expect(parseCsv('a,"b,c",d')).toEqual([["a", "b,c", "d"]]);
  });

  it("handles an escaped double quote inside a quoted field", () => {
    expect(parseCsv('a,"say ""hi""",c')).toEqual([["a", 'say "hi"', "c"]]);
  });

  it("handles a newline inside a quoted field", () => {
    expect(parseCsv('a,"line1\nline2",c')).toEqual([["a", "line1\nline2", "c"]]);
  });

  it("strips carriage returns from CRLF files", () => {
    // Excel exports CRLF — a stray \r would corrupt the last column of
    // every row if it were kept.
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops rows that are entirely blank or whitespace", () => {
    expect(parseCsv("a,b\n\n  ,  \n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("parses a final row with no trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toHaveLength(2);
  });
});
