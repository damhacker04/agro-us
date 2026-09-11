import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";
import { installBrowser } from "../test/browser";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const mockFetch = vi.fn<typeof fetch>();
const getRequest = () => {
  const [url, init] = mockFetch.mock.calls.at(-1)!;
  return { url: String(url), init: init!, headers: new Headers(init?.headers) };
};

describe("API transport contract", () => {
  beforeEach(() => {
    installBrowser();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset().mockImplementation(async () => response({ accepted: true }));
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("GETs live data without credentials when logged out", async () => {
    mockFetch.mockResolvedValueOnce(response([{ id: "zone-test" }]));
    expect(await api.ambilZona()).toEqual([{ id: "zone-test" }]);
    const { url, init, headers } = getRequest();
    expect(url).toMatch(/\/zones$/);
    expect(init.cache).toBe("no-store");
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("uses the configured API origin when the module is built/loaded", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
    vi.resetModules();
    const configured = await import("./api");
    await configured.ambilZona();
    expect(getRequest().url).toBe("https://api.example.test/zones");
    expect(configured.urlBerkas("/uploads/foto.jpg")).toBe("https://api.example.test/uploads/foto.jpg");
  });

  it("attaches the current token and encodes external query values", async () => {
    localStorage.setItem("agrous.token", "test-buyer-token");
    await api.ambilKatalog("Malang & Batu/1");
    expect(getRequest().url).toMatch(/\/catalog\?zoneId=Malang%20%26%20Batu%2F1$/);
    expect(getRequest().headers.get("Authorization")).toBe("Bearer test-buyer-token");
  });

  it("sends selected checkout options unchanged to the authoritative server", async () => {
    const body = {
      lines: [{ batchId: "batch-test", qtyBox: 2 }],
      delivery: { recipientName: "Rina", phone: "08123456789", point: { lat: -7.97, lng: 112.63 }, receivingHours: "08:00-16:00" },
      paymentMethod: "VA" as const, includeTraceabilityReport: true,
    };
    await api.checkout(body);
    expect(getRequest().url).toMatch(/\/orders\/checkout$/);
    expect(getRequest().init.method).toBe("POST");
    expect(JSON.parse(getRequest().init.body as string)).toEqual(body);
  });

  it("uses PATCH for buyer zone changes and PUT for legality documents", async () => {
    await api.ubahProfilPembeli({ activeZoneId: "zone-next" });
    expect(getRequest().init.method).toBe("PATCH");
    expect(JSON.parse(getRequest().init.body as string)).toEqual({ activeZoneId: "zone-next" });
    await api.kirimLegalitas("/uploads/nib.png");
    expect(getRequest().init.method).toBe("PUT");
    expect(JSON.parse(getRequest().init.body as string)).toEqual({ documentUrl: "/uploads/nib.png" });
  });

  it.each([
    [409, { code: "QUOTA_RACE_LOST", message: "Kuota telah habis." }, "QUOTA_RACE_LOST", "Kuota telah habis."],
    [400, { message: ["Nomor wajib", "Zona wajib"] }, null, "Nomor wajib, Zona wajib"],
    [401, {}, null, "Terjadi kesalahan (401)"],
    [500, null, null, "Terjadi kesalahan (500)"],
  ])("preserves actionable errors for status %s", async (status, body, code, message) => {
    mockFetch.mockResolvedValueOnce(response(body, status as number));
    await expect(api.ambilPesanan()).rejects.toMatchObject({ status, kode: code, message });
  });

  it("falls back safely for non-JSON server errors", async () => {
    mockFetch.mockResolvedValueOnce(new Response("<h1>Proxy unavailable</h1>", { status: 503 }));
    await expect(api.ambilPesanan()).rejects.toMatchObject({ status: 503, kode: null, message: "Terjadi kesalahan (503)" });
  });

  it("returns undefined for an empty 204 response", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.batalkanPesanan("order-test")).resolves.toBeUndefined();
  });

  it("does not disguise network failures as accepted writes", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.konfirmasiTerima("shipment-test", "/uploads/proof.jpg")).rejects.toThrow("Failed to fetch");
  });

  it("keeps signed/absolute upload URLs intact", () => {
    expect(api.urlBerkas("https://cdn.example.test/photo.jpg?signature=test")).toBe("https://cdn.example.test/photo.jpg?signature=test");
    expect(api.urlBerkas("HTTP://cdn.example.test/photo.jpg")).toBe("HTTP://cdn.example.test/photo.jpg");
    expect(api.urlBerkas("/uploads/proof.jpg")).toMatch(/\/uploads\/proof\.jpg$/);
  });

  it("encodes courier credentials and sends the code only in the body", async () => {
    await api.periksaToken("token/+?=");
    expect(getRequest().url).toMatch(/\/scan\/token%2F%2B%3F%3D$/);
    await api.verifikasiKodeAntar("token/+?=", "0012");
    expect(getRequest().url).toMatch(/\/scan\/token%2F%2B%3F%3D\/verify$/);
    expect(JSON.parse(getRequest().init.body as string)).toEqual({ code: "0012" });
  });

  it("uses the authenticated demo payment route rather than the provider webhook", async () => {
    await api.bayarSimulasi("invoice /123");
    expect(getRequest().url).toMatch(/\/payments\/invoice%20%2F123\/tandai-lunas$/);
    expect(getRequest().init.method).toBe("POST");
  });

  it("keeps harvest preview separate from final evidence submission", async () => {
    await api.deklarasiPanen("batch-test", 12);
    expect(getRequest().url).toMatch(/\/tenant\/batches\/batch-test\/harvest$/);
    expect(JSON.parse(getRequest().init.body as string)).toEqual({ actualBox: 12 });
    const form = new FormData();
    form.append("assessmentId", "assessment-test");
    await api.konfirmasiPanen("batch-test", form);
    expect(getRequest().url).toMatch(/\/harvest\/confirm$/);
    expect(getRequest().init.body).toBe(form);
    expect(getRequest().headers.has("Content-Type")).toBe(false);
  });

  it("preserves multipart boundaries with authenticated timeline photos", async () => {
    localStorage.setItem("agrous.token", "test-tenant-token");
    const form = new FormData();
    form.append("activityType", "PEMUPUKAN");
    await api.tambahNodeTimeline("batch-test", form);
    expect(getRequest().headers.get("Authorization")).toBe("Bearer test-tenant-token");
    expect(getRequest().headers.has("Content-Type")).toBe(false);
    expect(getRequest().init.body).toBe(form);
  });

  it.each([
    [{ code: "OUTSIDE_POLYGON", message: "Lokasi di luar petak" }, "OUTSIDE_POLYGON", "Lokasi di luar petak"],
    [{ message: ["Foto wajib", "GPS wajib"] }, null, "Foto wajib, GPS wajib"],
    [{}, null, "Gagal menyimpan catatan (400)"],
    [null, null, "Gagal menyimpan catatan (400)"],
  ])("normalizes multipart API validation errors: %j", async (body, code, message) => {
    mockFetch.mockResolvedValueOnce(response(body, 400));
    await expect(api.tambahNodeTimeline("batch-test", new FormData())).rejects.toMatchObject({ status: 400, kode: code, message });
  });

  it("normalizes non-JSON multipart failure without dropping operation context", async () => {
    mockFetch.mockResolvedValueOnce(new Response("bad gateway", { status: 502 }));
    await expect(api.konfirmasiPanen("batch-test", new FormData())).rejects.toThrow("Gagal mengonfirmasi panen (502)");
  });

  it.each([false, true])("uploads the file without a manual content-type (authenticated=%s)", async (authenticated) => {
    if (authenticated) localStorage.setItem("agrous.token", "test-upload-token");
    const file = new File(["test image"], "proof.jpg", { type: "image/jpeg" });
    mockFetch.mockResolvedValueOnce(response({ url: "/uploads/proof.jpg", sha256: "test-digest", bytes: 10 }));
    expect(await api.unggahFoto(file)).toEqual({ url: "/uploads/proof.jpg", sha256: "test-digest", bytes: 10 });
    expect(getRequest().url).toMatch(/\/uploads$/);
    expect((getRequest().init.body as FormData).get("file")).toEqual(file);
    expect(getRequest().headers.has("Content-Type")).toBe(false);
    expect(getRequest().headers.get("Authorization")).toBe(authenticated ? "Bearer test-upload-token" : null);
  });

  it.each([
    [{ code: "FILE_TOO_LARGE", message: "Foto terlalu besar" }, "FILE_TOO_LARGE", "Foto terlalu besar"],
    [{}, null, "Unggahan gagal (400)"],
  ])("normalizes upload failure: %j", async (body, code, message) => {
    mockFetch.mockResolvedValueOnce(response(body, 400));
    await expect(api.unggahFoto(new File(["x"], "proof.jpg"))).rejects.toMatchObject({ status: 400, kode: code, message });
  });

  it("handles a non-JSON upload failure", async () => {
    mockFetch.mockResolvedValueOnce(new Response("no storage", { status: 503 }));
    await expect(api.unggahFoto(new File(["x"], "proof.jpg"))).rejects.toThrow("Unggahan gagal (503)");
  });
});
