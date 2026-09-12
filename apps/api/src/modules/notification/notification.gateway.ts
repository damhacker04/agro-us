import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { NOTIF_EVENTS, NOTIF_NAMESPACE, type AppNotification } from "@agro-os/shared";
import { identifySocket } from "../auth/ws-auth";

/**
 * Kanal notifikasi in-app (FR-10.3).
 *
 * Namespace SENDIRI, terpisah dari `/tracking`: notifikasi bersifat per-PENGGUNA, bukan
 * per pengiriman. Pembeli tetap harus menerima putusan klaim atau kabar gagal panen
 * meski sedang tidak membuka peta pelacakan — kalau ditumpangkan ke room pengiriman,
 * justru kejadian terpentingnya yang tidak sampai.
 *
 * Room diikat ke TOKEN, bukan ke `userId` yang dikirim klien. Versi sebelumnya menerima
 * userId apa pun dari payload `subscribe`, sehingga penyadap yang tahu satu UUID pengguna
 * bisa mendengarkan putusan klaim dan kabar escrow milik orang lain. Payload `userId`
 * sekarang hanya boleh menyebut diri sendiri; selain itu ditolak.
 */
@WebSocketGateway({
  namespace: NOTIF_NAMESPACE,
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"] },
})
export class NotificationGateway {
  private readonly log = new Logger(NotificationGateway.name);

  constructor(private readonly jwt: JwtService) {}

  @WebSocketServer()
  server!: Server;

  private room(userId: string) {
    return `user:${userId}`;
  }

  @SubscribeMessage(NOTIF_EVENTS.SUBSCRIBE)
  async onSubscribe(@MessageBody() body: { userId?: string }, @ConnectedSocket() client: Socket) {
    const user = await identifySocket(this.jwt, client);
    if (!user) return { ok: false, error: "TOKEN_WAJIB" };
    // Menyebut userId lain bukan sekadar diabaikan, melainkan ditolak: diam-diam
    // memindahkan langganan ke room sendiri membuat klien mengira ia berhasil
    // mendengarkan orang lain, dan menyembunyikan percobaan itu dari log.
    if (body?.userId && body.userId !== user.sub) {
      this.log.debug(`klien ${client.id?.slice(0, 6)} ditolak mendengarkan room pengguna lain`);
      return { ok: false, error: "AKSES_DITOLAK" };
    }
    void client.join(this.room(user.sub));
    this.log.debug(`klien ${client.id?.slice(0, 6)} mendengarkan notifikasi ${user.sub.slice(0, 8)}`);
    return { ok: true, room: this.room(user.sub) };
  }

  push(userId: string, notif: AppNotification) {
    // `server` bisa undefined pada unit test tanpa adapter — kegagalan memancarkan
    // notifikasi tidak boleh menggagalkan transaksi yang memicunya.
    this.server?.to(this.room(userId)).emit(NOTIF_EVENTS.PUSH, notif);
  }
}
