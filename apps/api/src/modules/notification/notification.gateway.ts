import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { NOTIF_EVENTS, NOTIF_NAMESPACE, type AppNotification } from "@agro-os/shared";

/**
 * Kanal notifikasi in-app (FR-10.3).
 *
 * Namespace SENDIRI, terpisah dari `/tracking`: notifikasi bersifat per-PENGGUNA, bukan
 * per pengiriman. Pembeli tetap harus menerima putusan klaim atau kabar gagal panen
 * meski sedang tidak membuka peta pelacakan — kalau ditumpangkan ke room pengiriman,
 * justru kejadian terpentingnya yang tidak sampai.
 *
 * ⚠️ Sama seperti /tracking, room BELUM diautentikasi: siapa pun yang tahu userId bisa
 * ikut mendengarkan. userId berupa UUID acak sehingga tidak bisa ditebak, tetapi sebelum
 * produksi handshake wajib memverifikasi JWT.
 */
@WebSocketGateway({
  namespace: NOTIF_NAMESPACE,
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"] },
})
export class NotificationGateway {
  private readonly log = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  private room(userId: string) {
    return `user:${userId}`;
  }

  @SubscribeMessage(NOTIF_EVENTS.SUBSCRIBE)
  onSubscribe(@MessageBody() body: { userId?: string }, @ConnectedSocket() client: Socket) {
    const id = body?.userId;
    if (!id) return { ok: false, error: "userId wajib" };
    void client.join(this.room(id));
    this.log.debug(`klien ${client.id.slice(0, 6)} mendengarkan notifikasi ${id.slice(0, 8)}`);
    return { ok: true, room: this.room(id) };
  }

  push(userId: string, notif: AppNotification) {
    // `server` bisa undefined pada unit test tanpa adapter — kegagalan memancarkan
    // notifikasi tidak boleh menggagalkan transaksi yang memicunya.
    this.server?.to(this.room(userId)).emit(NOTIF_EVENTS.PUSH, notif);
  }
}
