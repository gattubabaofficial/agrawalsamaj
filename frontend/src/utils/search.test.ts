import { describe, expect, it } from "vitest";
import { filterBySearch, matchesSearch, searchableText } from "./search";

const MEMBERS = [
  {
    first_name: "Rajesh",
    surname: "Goyal",
    father_name: "S/o Narayan Goyal",
    samaj_id: "AS-1024",
    mobile_masked: "XXXXXX7901",
    zone: "Shipra Path",
    lm_no: 44,
  },
  {
    first_name: "Sunita",
    surname: "Mital",
    father_name: "W/o Rajesh Mital",
    samaj_id: "AS-2048",
    mobile_masked: "XXXXXX3312",
    zone: "Kaveri Path",
    lm_no: null,
  },
];

const FIELDS = [
  "first_name",
  "surname",
  "father_name",
  "samaj_id",
  "mobile_masked",
  "zone",
  "lm_no",
];

describe("searchableText", () => {
  it("joins the named fields", () => {
    const text = searchableText(MEMBERS[0], FIELDS);
    expect(text).toContain("rajesh");
    expect(text).toContain("as-1024");
  });

  it("skips null and missing fields without throwing", () => {
    const text = searchableText(MEMBERS[1], FIELDS);
    expect(text).toContain("sunita");
    expect(text).not.toContain("null");
  });

  it("includes numeric fields", () => {
    expect(searchableText(MEMBERS[0], FIELDS)).toContain("44");
  });
});

describe("matchesSearch", () => {
  it("matches everything when the query is empty or blank", () => {
    expect(matchesSearch(MEMBERS[0], "", FIELDS)).toBe(true);
    expect(matchesSearch(MEMBERS[0], "   ", FIELDS)).toBe(true);
  });

  it("matches a single term case-insensitively", () => {
    expect(matchesSearch(MEMBERS[0], "RAJESH", FIELDS)).toBe(true);
  });

  it("requires EVERY term to match, each in any field", () => {
    // The defect this replaces: matching "rajesh goyal" as one substring
    // failed against a name carrying a middle name.
    expect(matchesSearch(MEMBERS[0], "rajesh goyal", FIELDS)).toBe(true);
  });

  it("matches terms drawn from different fields", () => {
    expect(matchesSearch(MEMBERS[0], "rajesh shipra", FIELDS)).toBe(true);
    expect(matchesSearch(MEMBERS[0], "goyal AS-1024", FIELDS)).toBe(true);
  });

  it("fails when any single term is absent", () => {
    expect(matchesSearch(MEMBERS[0], "rajesh mital", FIELDS)).toBe(false);
  });

  it("matches the visible tail of a masked mobile number", () => {
    expect(matchesSearch(MEMBERS[0], "7901", FIELDS)).toBe(true);
  });

  it("collapses runs of whitespace between terms", () => {
    expect(matchesSearch(MEMBERS[0], "  rajesh    goyal  ", FIELDS)).toBe(true);
  });

  it("matches a relation prefix written into the parentage field", () => {
    expect(matchesSearch(MEMBERS[1], "w/o rajesh", FIELDS)).toBe(true);
  });
});

describe("filterBySearch", () => {
  it("returns every record for a blank query", () => {
    expect(filterBySearch(MEMBERS, "", FIELDS)).toHaveLength(2);
  });

  it("narrows to matching records", () => {
    const found = filterBySearch(MEMBERS, "sunita", FIELDS);
    expect(found).toHaveLength(1);
    expect(found[0].surname).toBe("Mital");
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterBySearch(MEMBERS, "zzzz", FIELDS)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const before = [...MEMBERS];
    filterBySearch(MEMBERS, "rajesh", FIELDS);
    expect(MEMBERS).toEqual(before);
  });
});
