import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./auth.guard";
import { Roles, RolesGuard, ROLES_KEY } from "./roles.guard";

function context(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }), getHandler: () => null, getClass: () => null } as unknown as ExecutionContext;
}

describe("Bearer authentication boundary", () => {
  it.each([undefined, "", "Basic abc", "Bearer ", "bearer abc"])("rejects missing or malformed token %s before verification", async (authorization) => {
    const verifyAsync = vi.fn();
    const guard = new JwtAuthGuard({ verifyAsync } as unknown as JwtService);
    await expect(guard.canActivate(context({ headers: { authorization } }))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it("uses only verified identity, replacing a preexisting request user", async () => {
    const user = { sub: "buyer-1", role: "BUYER" };
    const verifyAsync = vi.fn().mockResolvedValue(user);
    const req = { headers: { authorization: "Bearer signed-token" }, user: { role: "OPERATOR" } };
    await expect(new JwtAuthGuard({ verifyAsync } as unknown as JwtService).canActivate(context(req))).resolves.toBe(true);
    expect(verifyAsync).toHaveBeenCalledWith("signed-token");
    expect(req.user).toBe(user);
  });

  it("returns an authentication failure without exposing JWT verification details", async () => {
    const verifyAsync = vi.fn().mockRejectedValue(new Error("internal verifier detail"));
    const guard = new JwtAuthGuard({ verifyAsync } as unknown as JwtService);
    await expect(guard.canActivate(context({ headers: { authorization: "Bearer expired" } }))).rejects.toThrow("Token tidak valid atau kedaluwarsa");
  });
});

describe("role authorization boundary", () => {
  it.each([undefined, []])("allows routes without required roles (%j)", (required) => {
    const guard = new RolesGuard({ getAllAndOverride: () => required } as unknown as Reflector);
    expect(guard.canActivate(context({}))).toBe(true);
  });
  it.each([undefined, { role: "BUYER" }, { role: "TENANT" }])("rejects non-operator identity %j", (user) => {
    const guard = new RolesGuard({ getAllAndOverride: () => ["OPERATOR"] } as unknown as Reflector);
    expect(() => guard.canActivate(context({ user }))).toThrow(ForbiddenException);
  });
  it("allows one of several explicitly permitted roles", () => {
    const guard = new RolesGuard({ getAllAndOverride: () => ["TENANT", "OPERATOR"] } as unknown as Reflector);
    expect(guard.canActivate(context({ user: { role: "TENANT" } }))).toBe(true);
  });
  it("stores the declared route roles as metadata consumed by the guard", () => {
    class ProtectedController {}
    Roles("OPERATOR")(ProtectedController);
    expect(Reflect.getMetadata(ROLES_KEY, ProtectedController)).toEqual(["OPERATOR"]);
  });
});
