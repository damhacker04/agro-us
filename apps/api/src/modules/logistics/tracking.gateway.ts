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
import { WS_EVENTS, type GpsCoordinate } from "@agro-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { identifySocket } from "../auth/ws-auth";
import { bolehPantauPengiriman } from "./watch-authz";

/**
 * Pancaran posisi kurir ke pembeli (PRD §6.4).
 *
 * Satu "room" per pengiriman: pembeli berlangganan `shipment:subscribe` dengan id
 * pengiriman, lalu menerima `shipment:position` dan `shipment:status`.
 *
 * Room DIOTORISASI. Sebelumnya cukup tahu shipmentId untuk ikut memantau; UUID acak
 * memang sulit ditebak, tetapi id pengiriman beredar di tautan, tangkapan layar dan
 * dukungan pelanggan, dan "sulit ditebak" bukan kontrol akses. Sekarang ada dua jalan
 * masuk yang sah, keduanya membuktikan hubungan dengan pengiriman ini:
 *
 *   1. JWT di handshake — pembeli pemilik pesanan, tenant pemilik barang, atau operator.
 *   2. `sessionId` sesi pelacakan yang MASIH terbuka untuk pengiriman itu — kurir tidak
 *      punya akun (§5.6.2), jadi kredensialnya adalah sesi yang lahir dari scan QR + Kode
 *      Antar. Sesi yang sudah ditutup tidak lagi membuka pintu.
 */
@WebSocketGateway({
  namespace: "/tracking",
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"] },
})
export class TrackingGateway {
  private readonly log = new Logger(TrackingGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private room(shipmentId: string): string {
    return `shipment:${shipmentId}`;
  }

  @SubscribeMessage(WS_EVENTS.SUBSCRIBE)
  async onSubscribe(
    @MessageBody() body: { shipmentId?: string; sessionId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const id = body?.shipmentId;
    if (!id) return { ok: false, error: "shipmentId wajib" };
    if (!(await this.mayWatch(id, body?.sessionId, client))) {
      // Pesan galat sengaja sama untuk "pengiriman tidak ada" dan "bukan milik Anda":
      // membedakan keduanya menjadikan kanal ini alat memeriksa keberadaan pesanan orang.
      this.log.debug(`klien ${client.id?.slice(0, 6)} ditolak memantau ${id.slice(0, 8)}`);
      return { ok: false, error: "AKSES_DITOLAK" };
    }
    void client.join(this.room(id));
    this.log.debug(`klien ${client.id?.slice(0, 6)} memantau ${id.slice(0, 8)}`);
    return { ok: true, room: this.room(id) };
  }

  /**
   * Benar hanya bila pemanggil terbukti berhubungan dengan pengiriman ini.
   *
   * Aturannya sendiri ada di `watch-authz.ts` dan dibagi dengan endpoint REST: identitas
   * tetap diambil dari TOKEN di handshake, bukan dari payload yang dikirim klien.
   */
  private async mayWatch(shipmentId: string, sessionId: string | undefined, client: Socket): Promise<boolean> {
    const user = await identifySocket(this.jwt, client);
    return bolehPantauPengiriman(this.prisma, shipmentId, { user, sessionId });
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
