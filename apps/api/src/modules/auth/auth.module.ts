import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    // SmsService dulu tinggal di modul ini, padahal ia port pesan generik yang
    // kebetulan auth-lah konsumen pertamanya. Sekarang dimiliki NotificationModule.
    NotificationModule,
    JwtModule.registerAsync({
      global: true, // JwtService dipakai guard di modul lain nanti
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        // TIDAK ADA nilai cadangan — sengaja. Versi sebelumnya memakai secret bawaan
        // yang hanya ditolak saat NODE_ENV=production. Padahal NODE_ENV gampang
        // lupa diset di Railway/Render, dan begitu itu terjadi API berjalan memakai
        // secret yang terpampang publik di repositori: siapa pun bisa memalsukan JWT
        // ber-role OPERATOR. Gagal saat boot jauh lebih murah daripada dibobol.
        if (!secret || secret.length < 32) {
          throw new Error(
            "JWT_SECRET wajib diset dan minimal 32 karakter. " +
              'Buat dengan: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
          );
        }
        return { secret, signOptions: { expiresIn: "7d" } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
