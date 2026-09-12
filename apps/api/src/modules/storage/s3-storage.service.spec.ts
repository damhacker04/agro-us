import "reflect-metadata";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { GetObjectCommand, NoSuchKey, PutObjectCommand } from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3StorageService } from "./s3-storage.service";

const s3 = vi.hoisted(() => ({ send: vi.fn(), construct: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async (original) => ({
  ...await original<typeof import("@aws-sdk/client-s3")>(),
  S3Client: class {
    send = s3.send;
    constructor(options: unknown) { s3.construct(options); }
  },
}));

const jpeg = Buffer.from([0xff, 0xd8, 0xff, ...Array<number>(13).fill(0)]);
const envKeys = ["S3_ENDPOINT", "S3_BUCKET", "S3_PUBLIC_URL", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of envKeys) vi.stubEnv(key, undefined);
  vi.stubEnv("S3_BUCKET", "proof-test");
  vi.stubEnv("S3_ACCESS_KEY_ID", "test-access");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret");
  vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  s3.send.mockResolvedValue({});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("S3 configuration and public URLs", () => {
  it("uses the API read path by default and does not force an endpoint for AWS", () => {
    const storage = new S3StorageService();
    expect(s3.construct).toHaveBeenCalledWith({
      region: "auto", credentials: { accessKeyId: "test-access", secretAccessKey: "test-secret" },
    });
    expect(storage.info()).toEqual({ jenis: "S3", ephemeral: false, keterangan: expect.stringContaining("API sendiri") });
  });
  it("uses path-style requests for an explicitly configured S3-compatible endpoint", () => {
    vi.stubEnv("S3_ENDPOINT", "https://storage.example.test");
    vi.stubEnv("S3_REGION", "ap-southeast-1");
    new S3StorageService();
    expect(s3.construct).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: "https://storage.example.test", forcePathStyle: true, region: "ap-southeast-1",
    }));
  });
  it("removes trailing slashes while preserving a custom CDN path prefix", async () => {
    vi.stubEnv("S3_PUBLIC_URL", "https://cdn.example.test/proof///");
    const storage = new S3StorageService();
    const result = await storage.put(jpeg, "proof.jpg", "image/jpeg");
    expect(result.url).toMatch(/^https:\/\/cdn\.example\.test\/proof\/uploads\/[a-f0-9]{2}\/[a-f0-9]{64}\.jpg$/);
    expect(storage.info().keterangan).toBe("Bucket proof-test, dibaca langsung dari https://cdn.example.test/proof");
  });
  it.each(["https://bucket.r2.dev", "https://BUCKET.R2.DEV///"])("falls back to API for configured r2.dev host %s", async (publicUrl) => {
    vi.stubEnv("S3_PUBLIC_URL", publicUrl);
    const storage = new S3StorageService();
    expect((await storage.put(jpeg, "proof.jpg", "image/jpeg")).url).toMatch(/^\/uploads\//);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining("DIABAIKAN"));
    expect(storage.info().keterangan).toContain("API sendiri");
  });
  it("applies the r2.dev fallback to URLs with a path prefix too", async () => {
    vi.stubEnv("S3_PUBLIC_URL", "https://bucket.r2.dev/proof");
    const storage = new S3StorageService();
    expect((await storage.put(jpeg, "proof.jpg", "image/jpeg")).url).toMatch(/^\/uploads\//);
  });

  it("does not mistake a custom domain that merely contains the text for r2.dev", async () => {
    // `r2.dev.kebun.example` bukan r2.dev; pencocokan harus pada batas host, bukan substring.
    vi.stubEnv("S3_PUBLIC_URL", "https://r2.dev.kebun.example/proof");
    const storage = new S3StorageService();
    expect((await storage.put(jpeg, "proof.jpg", "image/jpeg")).url).toMatch(/^https:\/\/r2\.dev\.kebun\.example\//);
  });
});

describe("S3 evidence writes", () => {
  it("hashes actual bytes and overrides a spoofed HTML name/MIME using the signature", async () => {
    const hash = createHash("sha256").update(jpeg).digest("hex");
    const storage = new S3StorageService();
    const result = await storage.put(jpeg, "../../script.html", "text/html");
    expect(result).toEqual({ url: `/uploads/${hash.slice(0, 2)}/${hash}.jpg`, sha256: hash, bytes: jpeg.length });
    const command = s3.send.mock.calls[0]![0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: "proof-test", Key: `uploads/${hash.slice(0, 2)}/${hash}.jpg`, Body: jpeg,
      ContentType: "image/jpeg", ContentDisposition: "inline", CacheControl: "public, max-age=31536000, immutable",
    });
    expect(await storage.put(jpeg, "renamed.png", "image/png")).toEqual(result);
  });
  it("makes unknown content an octet-stream with no executable extension", async () => {
    const bytes = Buffer.from("<script>alert('not an image')</script>");
    const result = await new S3StorageService().put(bytes, "pretend.jpg", "image/jpeg");
    expect(result.url).toMatch(/^\/uploads\/[a-f0-9]{2}\/[a-f0-9]{64}$/);
    const command = s3.send.mock.calls[0]![0] as PutObjectCommand;
    expect(command.input.ContentType).toBe("application/octet-stream");
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining("bukan JPEG/PNG/WebP"));
  });
  it("does not fabricate a URL after a failed write", async () => {
    s3.send.mockRejectedValueOnce(new Error("upload failed"));
    await expect(new S3StorageService().put(jpeg, "proof.jpg", "image/jpeg")).rejects.toThrow("upload failed");
  });
});

describe("S3 evidence reads", () => {
  it("returns the object stream, MIME and known length", async () => {
    const stream = Readable.from([jpeg]);
    s3.send.mockResolvedValueOnce({ Body: stream, ContentType: "image/jpeg", ContentLength: jpeg.length });
    expect(await new S3StorageService().baca("uploads/aa/proof.jpg")).toEqual({ stream, contentType: "image/jpeg", bytes: jpeg.length });
    const command = s3.send.mock.calls[0]![0] as GetObjectCommand;
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({ Bucket: "proof-test", Key: "uploads/aa/proof.jpg" });
  });
  it.each([undefined, 0])("defaults MIME and omits an unavailable or empty ContentLength %s", async (length) => {
    const stream = Readable.from([]);
    s3.send.mockResolvedValueOnce({ Body: stream, ContentLength: length });
    expect(await new S3StorageService().baca("uploads/aa/proof")).toEqual({ stream, contentType: "application/octet-stream" });
  });
  it("returns null when the response does not contain a body", async () => {
    expect(await new S3StorageService().baca("uploads/aa/missing.jpg")).toBeNull();
  });
  it.each([
    new NoSuchKey({ message: "missing", $metadata: { httpStatusCode: 404 } }),
    Object.assign(new Error("missing"), { name: "NoSuchKey" }),
  ])("maps provider NoSuchKey variants to missing, rather than 500", async (failure) => {
    s3.send.mockRejectedValueOnce(failure);
    expect(await new S3StorageService().baca("uploads/aa/missing.jpg")).toBeNull();
  });
  it("propagates permission and transport failures instead of returning 404", async () => {
    const failure = Object.assign(new Error("access denied"), { name: "AccessDenied" });
    s3.send.mockRejectedValueOnce(failure);
    await expect(new S3StorageService().baca("uploads/aa/proof.jpg")).rejects.toBe(failure);
  });
});
