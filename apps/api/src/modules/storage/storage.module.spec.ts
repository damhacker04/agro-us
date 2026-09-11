import "reflect-metadata";
import { Logger, type FactoryProvider } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageModule } from "./storage.module";
import { LocalDiskStorageService, StorageService } from "./storage.service";
import { S3StorageService } from "./s3-storage.service";

vi.mock("./s3-storage.service", () => ({ S3StorageService: class {} }));
vi.mock("./upload.controller", () => ({ UploadController: class {} }));

const required = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
const factory = (Reflect.getMetadata("providers", StorageModule) as FactoryProvider<StorageService>[])
  .find((provider) => provider.provide === StorageService)!;

beforeEach(() => {
  for (const key of [...required, "S3_PUBLIC_URL", "S3_ENDPOINT"]) vi.stubEnv(key, undefined);
  vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("storage provider selection", () => {
  it("exports the storage port and configures a delayed factory", () => {
    expect(Reflect.getMetadata("exports", StorageModule)).toContain(StorageService);
    expect(factory.useFactory).toBeTypeOf("function");
  });
  it("uses local disk explicitly when no S3 credentials exist", () => {
    expect(factory.useFactory()).toBeInstanceOf(LocalDiskStorageService);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining("JANGAN dipakai di produksi"));
  });
  it("evaluates credentials after import so ConfigModule-loaded env can select S3", () => {
    for (const key of required) vi.stubEnv(key, "test-value");
    expect(factory.useFactory()).toBeInstanceOf(S3StorageService);
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
    // S3_PUBLIC_URL remains optional: the default read URL comes through the API.
    expect(process.env.S3_PUBLIC_URL).toBeUndefined();
  });
  it.each(required)("rejects an incomplete configuration with only %s", (present) => {
    vi.stubEnv(present, "test-value");
    expect(() => factory.useFactory()).toThrow("Konfigurasi S3 tidak lengkap");
    expect(() => factory.useFactory()).toThrow(required.filter((key) => key !== present).join(", "));
  });
  it.each(required)("rejects missing or empty required value %s", (missing) => {
    for (const key of required) vi.stubEnv(key, key === missing ? "" : "test-value");
    expect(() => factory.useFactory()).toThrow(`${missing} belum disetel`);
  });
});
