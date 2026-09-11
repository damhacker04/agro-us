import { vi } from "vitest";

/** A fresh browser storage boundary for each unit test. No network or persistent data. */
export function installBrowser() {
  const data = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
    clear: vi.fn(() => data.clear()),
  };
  const browser = { dispatchEvent: vi.fn() };
  vi.stubGlobal("window", browser);
  vi.stubGlobal("localStorage", storage);
  return { storage, browser };
}
