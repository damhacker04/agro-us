import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ConsoleSmsService, SmsService } from "./sms.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true, // JwtService dipakai guard di modul lain nanti
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret && process.env.NODE_ENV === "production") {
          throw new Error("JWT_SECRET wajib diset di production");
        }
        return {
          secret: secret ?? "agrous-dev-secret-GANTI-DI-PRODUCTION",
          signOptions: { expiresIn: "7d" },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: SmsService, useClass: ConsoleSmsService }],
})
export class AuthModule {}
