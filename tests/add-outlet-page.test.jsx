import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/app/(dashboard)/dashboard/outlet/_components/OutletForm", async () => {
  const { useToast } = await import("@/components/ui/use-toast");

  return {
    default: function MockOutletForm() {
      useToast();
      return <div>Outlet form ready</div>;
    },
  };
});

import AddOutletPage from "../src/app/(dashboard)/dashboard/outlet/addoutlet/page";

describe("AddOutletPage", () => {
  it("provides toast context to the create form", () => {
    expect(renderToString(<AddOutletPage />)).toContain("Outlet form ready");
  });
});
