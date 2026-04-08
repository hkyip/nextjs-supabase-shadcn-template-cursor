import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges classes", () => {
    expect(cn("p-2", "p-4")).toContain("p-4");
  });
});
