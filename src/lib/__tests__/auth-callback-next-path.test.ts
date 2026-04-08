import { describe, expect, it } from "vitest";

import {
  AUTH_CALLBACK_DEFAULT_NEXT_PATH,
  sanitizeAuthCallbackNextPath,
} from "@/lib/auth-callback-next-path";

describe("sanitizeAuthCallbackNextPath", () => {
  it("uses default when null or empty", () => {
    expect(sanitizeAuthCallbackNextPath(null)).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
    expect(sanitizeAuthCallbackNextPath("")).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
  });

  it("allows simple internal paths", () => {
    expect(sanitizeAuthCallbackNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeAuthCallbackNextPath("/a/b")).toBe("/a/b");
    expect(sanitizeAuthCallbackNextPath("/x?y=1")).toBe("/x?y=1");
    expect(sanitizeAuthCallbackNextPath("/x#h")).toBe("/x#h");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(sanitizeAuthCallbackNextPath("//evil.com")).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
    expect(sanitizeAuthCallbackNextPath("https://evil.com")).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
    expect(sanitizeAuthCallbackNextPath("/\\evil")).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
    expect(sanitizeAuthCallbackNextPath("/proto://x")).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
  });

  it("rejects paths that do not start with a single slash", () => {
    expect(sanitizeAuthCallbackNextPath("dashboard")).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
    expect(sanitizeAuthCallbackNextPath("///triple")).toBe(
      AUTH_CALLBACK_DEFAULT_NEXT_PATH,
    );
  });
});
