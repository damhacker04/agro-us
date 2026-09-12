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

  /**
   * `document.cookie` is stubbed with real set/expire semantics, not a spy.
   *
   * The route guard in `middleware.ts` runs on the server and can only see cookies, so
   * "the role cookie is written on login and expired on logout" is now load-bearing
   * behaviour. A bare `vi.fn()` would record the assignment while proving nothing about
   * what a later reader would find.
   */
  const cookies = new Map<string, string>();
  const dokumen = {
    get cookie(): string {
      return [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(raw: string) {
      const [pasangan, ...atribut] = raw.split(";").map((s) => s.trim());
      const pisah = pasangan?.indexOf("=") ?? -1;
      if (pisah < 1) return;
      const nama = pasangan!.slice(0, pisah);
      const nilai = pasangan!.slice(pisah + 1);
      const kedaluwarsa = atribut.some((a) => /^max-age=0$/i.test(a) || /^expires=/i.test(a));
      if (kedaluwarsa || nilai === "") cookies.delete(nama);
      else cookies.set(nama, nilai);
    },
  };

  vi.stubGlobal("window", browser);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("document", dokumen);
  return { storage, browser, cookies };
}
