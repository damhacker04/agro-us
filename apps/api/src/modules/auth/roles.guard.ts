import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "../../../generated/prisma/enums";
import type { JwtPayload } from "./auth.service";

export const ROLES_KEY = "roles";

/** Batasi handler/controller ke peran tertentu: `@Roles("TENANT")`. Selalu dipasang SETELAH JwtAuthGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const user: JwtPayload | undefined = ctx.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException({
        code: "ROLE_FORBIDDEN",
        message: `Endpoint ini hanya untuk peran: ${required.join(", ")}`,
      });
    }
    return true;
  }
}
