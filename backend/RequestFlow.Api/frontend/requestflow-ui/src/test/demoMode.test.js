import {
  describe,
  expect,
  it
} from "vitest";

import {
  canUseDemoSettings,
  isDemoModeEnabled
} from "../utils/demoMode";

describe("demo settings access", () => {
  const enabledDemo = {
    VITE_DEMO_MODE: "true"
  };

  it("recognizes the public demo build", () => {
    expect(
      isDemoModeEnabled(enabledDemo)
    ).toBe(true);

    expect(
      isDemoModeEnabled({
        VITE_DEMO_MODE: "false"
      })
    ).toBe(false);
  });

  it("allows only Supervisors in demo mode", () => {
    expect(
      canUseDemoSettings(
        { role: "Supervisor" },
        enabledDemo
      )
    ).toBe(true);

    expect(
      canUseDemoSettings(
        { role: "Staff" },
        enabledDemo
      )
    ).toBe(false);

    expect(
      canUseDemoSettings(
        { role: "Supervisor" },
        { VITE_DEMO_MODE: "false" }
      )
    ).toBe(false);
  });
});
