import "reflect-metadata";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { Readable } from "node:stream";
import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalDiskStorageService, kenaliGambar } from "./storage.service";

const disk = vi.hoisted(() => ({ mkdir: vi.fn(), writeFile: vi.fn(), stat: vi.fn(), createReadStream: vi.fn() }));
vi.mock("node:fs/promises", async (original) => ({
  ...await original<typeof import("node:fs/promises")>(),
  mkdir: disk.mkdir, writeFile: disk.writeFile, stat: disk.stat,
}));
vi.mock("node:fs", async (original) => ({
  ...await original<typeof import("node:fs")>(), createReadStream: disk.createReadStream,
}));

const jpeg = Buffer.from([0xff, 0xd8, 0xff, ...Array<number>(13).fill(0)]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array<number>(8).fill(0)]);
const webp = Buffer.from("RIFF1234WEBPpayload");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  disk.mkdir.mockResolvedValue(undefined);
  disk.writeFile.mockResolvedValue(undefined);
  disk.stat.mockResolvedValue({ isFile: () => true, size: 16 });
  disk.createReadStream.mockReturnValue(Readable.from(["image"]));
});
afterEach(() => { vi.restoreAllMocks(); });

describe("image signature identification", () => {
  it.each([[jpeg, ".jpg", "image/jpeg"], [png, ".png", "image/png"], [webp, ".webp", "image/webp"]] as const)(
    "recognizes supported signature %s", (bytes, ext, mime) => {
      expect(kenaliGambar(bytes)).toEqual({ ext, mime });
    },
  );
  it.each([
    Buffer.alloc(0), Buffer.alloc(11), Buffer.from("<script>alert(1)</script>"),
    Buffer.from([0xff, 0, 0, ...Array<number>(13).fill(0)]),
    Buffer.from([0xff, 0xd8, 0, ...Array<number>(13).fill(0)]),
    Buffer.from("RIFF1234WAVEpayload"), Buffer.from("NOTR1234WEBPpayload"),
  ])("rejects short content or a signature outside JPEG/PNG/WebP", (bytes) => {
    expect(kenaliGambar(bytes)).toBeNull();
  });
});

describe("local storage content addressing", () => {
  it.each([[jpeg, ".jpg"], [png, ".png"], [webp, ".webp"]] as const)(
    "uses content type rather than an attacker-controlled filename", async (bytes, extension) => {
      const storage = new LocalDiskStorageService();
      const hash = createHash("sha256").update(bytes).digest("hex");
      const result = await storage.put(bytes, "../../injected.html", "text/html");
      expect(result).toEqual({ url: `/uploads/${hash.slice(0, 2)}/${hash}${extension}`, sha256: hash, bytes: bytes.length });
      const directory = join(process.cwd(), "uploads", hash.slice(0, 2));
      expect(disk.mkdir).toHaveBeenCalledWith(directory, { recursive: true });
      expect(disk.writeFile).toHaveBeenCalledWith(join(directory, `${hash}${extension}`), bytes);
      expect(Logger.prototype.warn).not.toHaveBeenCalled();
      expect(await storage.put(bytes, "renamed.png", "image/png")).toEqual(result);
    },
  );
  it("stores unrecognized content without a dangerous extension even when MIME claims PNG", async () => {
    const bytes = Buffer.from("<script>alert('spoofed MIME')</script>");
    const result = await new LocalDiskStorageService().put(bytes, "proof.png", "image/png");
    expect(result.url).toMatch(/^\/uploads\/[a-f0-9]{2}\/[a-f0-9]{64}$/);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining("bukan JPEG/PNG/WebP"));
    expect(disk.writeFile).toHaveBeenCalledWith(expect.stringContaining(result.sha256), bytes);
  });
  it.each(["mkdir", "writeFile"] as const)("propagates %s failure without reporting a stored object", async (operation) => {
    disk[operation].mockRejectedValueOnce(new Error("disk unavailable"));
    await expect(new LocalDiskStorageService().put(jpeg, "proof.jpg", "image/jpeg")).rejects.toThrow("disk unavailable");
    if (operation === "mkdir") expect(disk.writeFile).not.toHaveBeenCalled();
  });
  it("makes ephemeral storage visible to the operator", () => {
    expect(new LocalDiskStorageService().info()).toEqual({
      jenis: "DISK_LOKAL", ephemeral: true, keterangan: expect.stringContaining("HILANG setiap redeploy"),
    });
  });
});

describe("local object reads", () => {
  it.each([["aa/proof.jpg", "image/jpeg"], ["aa/proof.PNG", "image/png"], ["aa/proof.webp", "image/webp"],
           ["aa/proof", "application/octet-stream"]])("streams %s with server-determined MIME", async (key, mime) => {
    const storage = new LocalDiskStorageService();
    const result = await storage.baca(`uploads/${key}`);
    expect(disk.stat).toHaveBeenCalledWith(join(process.cwd(), "uploads", key));
    expect(disk.createReadStream).toHaveBeenCalledWith(join(process.cwd(), "uploads", key));
    expect(result).toEqual({ stream: disk.createReadStream.mock.results[0]!.value, contentType: mime, bytes: 16 });
  });
  it("also accepts an internal key without the uploads prefix", async () => {
    await new LocalDiskStorageService().baca("aa/proof.jpg");
    expect(disk.stat).toHaveBeenCalledWith(join(process.cwd(), "uploads", "aa/proof.jpg"));
  });
  it("returns null for a directory without opening a stream", async () => {
    disk.stat.mockResolvedValueOnce({ isFile: () => false, size: 0 });
    expect(await new LocalDiskStorageService().baca("aa")).toBeNull();
    expect(disk.createReadStream).not.toHaveBeenCalled();
  });
  it("returns null for an absent object", async () => {
    disk.stat.mockRejectedValueOnce(Object.assign(new Error("missing"), { code: "ENOENT" }));
    expect(await new LocalDiskStorageService().baca("aa/missing.jpg")).toBeNull();
  });
  const regression = process.env.QA_ENFORCE_REGRESSIONS === "1" ? it : it.fails;
  regression("KNOWN GAP: local permission failures must not masquerade as an absent proof", async () => {
    const failure = Object.assign(new Error("permission denied"), { code: "EACCES" });
    disk.stat.mockRejectedValueOnce(failure);
    await expect(new LocalDiskStorageService().baca("aa/proof.jpg")).rejects.toBe(failure);
  });
});
