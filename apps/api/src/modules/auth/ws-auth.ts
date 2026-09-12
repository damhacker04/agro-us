import { Logger } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Socket } from "socket.io";
import type { JwtPayload } from "./auth.service";

/**
 * Identitas untuk koneksi WebSocket.
 *
 * Guard HTTP tidak berlaku di sini: `@SubscribeMessage` tidak melewati `ExecutionContext`
 * HTTP, jadi Bearer token harus diambil sendiri dari handshake. Yang penting: identitas
 * diambil dari TOKEN, tidak pernah dari payload `subscribe` yang dikirim klien. Klien
 * boleh menyebut room mana yang ia mau; ia tidak boleh menyebut dirinya siapa.
 */
const log = new Logger("WsAuth");

/**
 * Token diambil dari `handshake.auth.token` (cara socket.io) atau header `Authorization`.
 * Query string sengaja TIDAK dibaca: URL WebSocket ikut tercatat di log proxy dan access
 * log, dan token yang bocor ke log sama saja dengan kata sandi yang bocor ke log.
 */
export function extractSocketToken(client: Pick<Socket, "handshake">): string | undefined {
  const handshake = client?.handshake as Socket["handshake"] | undefined;
  const fromAuth = (handshake?.auth as { token?: unknown } | undefined)?.token;
  if (typeof fromAuth === "string" && fromAuth.length > 0) {
    return fromAuth.startsWith("Bearer ") ? fromAuth.slice(7) : fromAuth;
  }
  const header = handshake?.headers?.["authorization"];
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

/**
 * Verifikasi token handshake. Mengembalikan `null` — bukan melempar — karena kegagalan
 * autentikasi pada kanal WS dijawab lewat ack `{ ok: false }`, bukan exception HTTP.
 */
export async function identifySocket(
  jwt: Pick<JwtService, "verifyAsync">,
  client: Pick<Socket, "handshake">,
): Promise<JwtPayload | null> {
  const token = extractSocketToken(client);
  if (!token) return null;
  try {
    return await jwt.verifyAsync<JwtPayload>(token);
  } catch {
    log.debug("handshake WS ditolak: token tidak valid atau kedaluwarsa");
    return null;
  }
}
