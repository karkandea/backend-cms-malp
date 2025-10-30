import { describe, expect, it } from "vitest";

import { ValidationErrorResponse } from "@/lib/api-error";
import { normalizePhone, parseLatLng } from "@/lib/validation";

describe("parseLatLng", () => {
  it("throws OUT_OF_RANGE_LNG when longitude is greater than 180", () => {
    try {
      parseLatLng("200", "lng");
      expect.fail("Expected parseLatLng to throw OUT_OF_RANGE_LNG");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationErrorResponse);
      const validationError = error as ValidationErrorResponse;
      expect(validationError.code).toBe("OUT_OF_RANGE_LNG");
    }
  });

  it("throws PRECISION_EXCEEDED when latitude has more than 6 decimals", () => {
    try {
      parseLatLng("-6.2000001", "lat");
      expect.fail("Expected parseLatLng to throw PRECISION_EXCEEDED");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationErrorResponse);
      const validationError = error as ValidationErrorResponse;
      expect(validationError.code).toBe("PRECISION_EXCEEDED");
    }
  });

  it("throws LAT_LNG_INVALID_UNIT when value is likely in meters", () => {
    try {
      parseLatLng("-6200000", "lat");
      expect.fail("Expected parseLatLng to throw LAT_LNG_INVALID_UNIT");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationErrorResponse);
      const validationError = error as ValidationErrorResponse;
      expect(validationError.code).toBe("LAT_LNG_INVALID_UNIT");
    }
  });
});

describe("normalizePhone", () => {
  it("normalizes formatted number into E.164", () => {
    expect(normalizePhone("+62-812 3456")).toBe("+628123456");
  });
});
