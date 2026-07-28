import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { WS_EVENTS, type GpsCoordinate } from "@agro-os/shared";

/**
 * Pancaran posisi kurir ke pembeli (PRD §6.4).
 *
 * Satu "room" per pengiriman: pembeli berlangganan `shipment:subscribe` dengan id
 * pengiriman, lalu menerima `shipment:position` dan `shipment:status`.
 *
 * ⚠️ Room BELUM diautentikasi — siapa pun yang tahu shipmentId bisa ikut memantau.
 * ID-nya UUID acak sehingga tidak bisa ditebak, tetapi sebelum produksi tetap perlu
 * verifikasi JWT pada handshake agar hanya pembeli pemilik pesanan yang bisa masuk.
 */
@WebSocketGateway({
  namespace: "/tracking",
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"] },
})
export class TrackingGateway {
  private readonly log = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server!: Server;

  private room(shipmentId: string): string {
    return `shipment:${shipmentId}`;
  }

  @SubscribeMessage(WS_EVENTS.SUBSCRIBE)
  onSubscribe(@MessageBody() body: { shipmentId?: string }, @ConnectedSocket() client: Socket) {
    const id = body?.shipmentId;
    if (!id) return { ok: false, error: "shipmentId wajib" };
    void client.join(this.room(id));
    this.log.debug(`klien ${client.id.slice(0, 6)} memantau ${id.slice(0, 8)}`);
    return { ok: true, room: this.room(id) };
  }

  emitPosition(shipmentId: string, position: GpsCoordinate, at: Date, distanceToDestM: number) {
    // `server` bisa undefined saat unit test tanpa adapter — jangan sampai
    // kegagalan pancaran menggagalkan penyimpanan posisi.
    this.server?.to(this.room(shipmentId)).emit(WS_EVENTS.POSITION, {
      shipmentId,
      position,
      positionAt: at.toISOString(),
      distanceToDestM: Math.round(distanceToDestM),
    });
  }

  emitStatus(shipmentId: string, status: string) {
    this.server?.to(this.room(shipmentId)).emit(WS_EVENTS.STATUS, { shipmentId, status });
  }
}
