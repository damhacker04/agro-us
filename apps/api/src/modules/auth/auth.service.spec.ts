import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from "@agro-os/shared";
import { AuthService } from "./auth.service";

const phone = "+6281234567890";
const pepper = "qa-only-pepper-32-characters-long";
const hash = (code: string) => createHash("sha256").update(`${pepper}|${phone}|${code}`).digest("hex");
const now = new Date("2026-09-09T00:00:00Z");
function fixture() {
  const prisma = {
    otpRequest: { findFirst: vi.fn().mockResolvedValue(null), deleteMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    user: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "u1", phone, role: "BUYER" }) },
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue("signed-token") };
  const sms = { send: vi.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma as never, jwt as never, sms as never);
  return { prisma, jwt, sms, service };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("OTP_PEPPER", pepper); vi.stubEnv("DEMO_EXPOSE_OTP", "false"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("AuthService OTP lifecycle", () => {
  it.each(["081234567890", "6281234567890", "+62 812-3456-7890"])("normalizes %s and stores only a peppered hash", async (raw) => {
    const { prisma, sms, service } = fixture();
    const result = await service.requestOtp(raw);
    const sentCode = sms.send.mock.calls[0]![1].match(/\d{6}/)![0];
    expect(sms.send.mock.calls[0]![0]).toBe(phone);
    expect(prisma.otpRequest.create).toHaveBeenCalledWith({ data: { phone, codeHash: hash(sentCode), expiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
    expect(result).toEqual({ expiresInSec: OTP_TTL_MS / 1000, resendAfterSec: OTP_RESEND_COOLDOWN_MS / 1000 });
    expect(JSON.stringify(prisma.otpRequest.create.mock.calls)).not.toContain(`"${sentCode}"`);
  });
  it("rejects unsupported phone prefixes before database access", async () => {
    const { prisma, service } = fixture();
    await expect(service.requestOtp("+15555555555")).rejects.toThrow("Nomor telepon tidak valid");
    expect(prisma.otpRequest.findFirst).not.toHaveBeenCalled();
  });
  it("returns a precise cooldown without deleting or sending a new OTP", async () => {
    const { prisma, sms, service } = fixture();
    prisma.otpRequest.findFirst.mockResolvedValue({ sentAt: new Date(now.getTime() - 1001) });
    await expect(service.requestOtp(phone)).rejects.toMatchObject({ response: { code: "OTP_COOLDOWN", retryAfterSec: 59 } });
    expect(prisma.otpRequest.deleteMany).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });
  it("replaces the old OTP at the cooldown boundary and exposes it only in explicit demo mode", async () => {
    const { prisma, sms, service } = fixture();
    vi.stubEnv("DEMO_EXPOSE_OTP", "true");
    prisma.otpRequest.findFirst.mockResolvedValue({ sentAt: new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS) });
    const result = await service.requestOtp(phone);
    expect(result.devOtp).toMatch(/^\d{6}$/);
    expect(sms.send.mock.calls[0]![1]).toContain(result.devOtp);
    expect(prisma.otpRequest.deleteMany).toHaveBeenCalledWith({ where: { phone, consumedAt: null } });
  });
  it.each(["", "short"])("fails closed when OTP pepper is %s", async (value) => {
    const { service, sms, prisma } = fixture();
    vi.stubEnv("OTP_PEPPER", value);
    await expect(service.requestOtp(phone)).rejects.toThrow("OTP_PEPPER wajib diset");
    expect(prisma.otpRequest.create).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });
  it("rejects expired or missing OTP", async () => {
    const { service, jwt } = fixture();
    await expect(service.verifyOtp(phone, "123456")).rejects.toMatchObject({ response: { code: "OTP_EXPIRED" } });
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
  it("rejects a locked OTP even when the code is correct", async () => {
    const { service, prisma } = fixture();
    prisma.otpRequest.findFirst.mockResolvedValue({ attempts: OTP_MAX_ATTEMPTS, codeHash: hash("123456") });
    await expect(service.verifyOtp(phone, "123456")).rejects.toMatchObject({ response: { code: "OTP_LOCKED" } });
    expect(prisma.otpRequest.updateMany).not.toHaveBeenCalled();
  });
  it.each([1, OTP_MAX_ATTEMPTS, OTP_MAX_ATTEMPTS + 1])("increments a wrong-code attempt and clamps remaining count (%i)", async (attempts) => {
    const { service, prisma, jwt } = fixture();
    prisma.otpRequest.findFirst.mockResolvedValue({ id: "otp1", attempts: 0, codeHash: hash("123456") });
    prisma.otpRequest.update.mockResolvedValue({ attempts });
    await expect(service.verifyOtp(phone, "000000")).rejects.toMatchObject({ response: { code: "OTP_WRONG", remainingAttempts: Math.max(OTP_MAX_ATTEMPTS - attempts, 0) } });
    expect(prisma.otpRequest.update).toHaveBeenCalledWith({ where: { id: "otp1" }, data: { attempts: { increment: 1 } } });
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
  it("preserves a valid OTP until a new user chooses a role", async () => {
    const { service, prisma } = fixture();
    prisma.otpRequest.findFirst.mockResolvedValue({ id: "otp1", attempts: 0, codeHash: hash("123456") });
    await expect(service.verifyOtp(phone, "123456")).rejects.toMatchObject({ response: { code: "ROLE_REQUIRED" } });
    expect(prisma.otpRequest.updateMany).not.toHaveBeenCalled();
  });
  it("creates a new buyer only after consuming the OTP atomically", async () => {
    const { service, prisma, jwt } = fixture();
    prisma.otpRequest.findFirst.mockResolvedValue({ id: "otp1", attempts: 0, codeHash: hash("123456") });
    expect(await service.verifyOtp(phone, "123456", "BUYER")).toEqual({ accessToken: "signed-token", isNewUser: true, user: { id: "u1", phone, role: "BUYER" } });
    expect(prisma.otpRequest.updateMany.mock.invocationCallOrder[0]).toBeLessThan(prisma.user.create.mock.invocationCallOrder[0]!);
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: "u1", phone, role: "BUYER" });
  });
  it("uses an existing user's stored role, preventing role escalation", async () => {
    const { service, prisma } = fixture();
    prisma.otpRequest.findFirst.mockResolvedValue({ id: "otp1", attempts: 0, codeHash: hash("123456") });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", phone, role: "BUYER" });
    expect(await service.verifyOtp(phone, "123456", "TENANT")).toMatchObject({ isNewUser: false, user: { role: "BUYER" } });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("rejects a replay when another request has already consumed the valid code", async () => {
    const { service, prisma, jwt } = fixture();
    prisma.otpRequest.findFirst.mockResolvedValue({ id: "otp1", attempts: 0, codeHash: hash("123456") });
    prisma.otpRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.verifyOtp(phone, "123456", "BUYER")).rejects.toMatchObject({ response: { code: "OTP_EXPIRED" } });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
  it("returns only the profile contract and rejects deleted users", async () => {
    const { service, prisma } = fixture();
    await expect(service.me("u1")).rejects.toMatchObject({ status: 401 });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", phone, role: "BUYER", tenant: null, buyer: { id: "b1" }, secret: "hidden" });
    expect(await service.me("u1")).toEqual({ id: "u1", phone, role: "BUYER", tenant: null, buyer: { id: "b1" } });
  });
});
