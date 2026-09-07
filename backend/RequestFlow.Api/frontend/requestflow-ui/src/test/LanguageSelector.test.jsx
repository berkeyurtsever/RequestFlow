import {
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import LanguageSelector from "../components/LanguageSelector";
import { LanguageProvider } from "../context/LanguageContext";

describe("LanguageSelector", () => {
  beforeEach(() => {
    const values = new Map();

    vi.stubGlobal("localStorage", {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) =>
        values.set(key, String(value)),
      removeItem: key => values.delete(key),
      clear: () => values.clear()
    });

    localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("changes and remembers the interface language", () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const selector = screen.getByLabelText("Language");

    fireEvent.change(selector, {
      target: { value: "tr" }
    });

    expect(
      screen.getByLabelText("Dil")
    ).toHaveValue("tr");
    expect(document.documentElement.lang).toBe("tr");
    expect(
      localStorage.getItem("requestflow_language")
    ).toBe("tr");
  });
});
