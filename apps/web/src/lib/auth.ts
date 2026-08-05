"use client";

/**
 * Penyimpanan sesi pengguna di sisi klien.
 *
 * Token disimpan di `localStorage`, bukan cookie httpOnly. Konsekuensinya jujur: skrip
 * apa pun yang berhasil disuntikkan ke halaman bisa membacanya (XSS). Untuk peragaan
 * dengan data karangan ini dapat diterima; sebelum ada pengguna sungguhan, pindahkan ke
 * cookie httpOnly + SameSite yang diterbitkan server.
 */
import type { AuthUser } from "@agro-os/shared";

const KUNCI_TOKEN = "agrous.token";
const KUNCI_USER = "agrous.user";

export function simpanSesi(token: string, user: AuthUser) {
  localStorage.setItem(KUNCI_TOKEN, token);
  localStorage.setItem(KUNCI_USER, JSON.stringify(user));
}

export function ambilToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KUNCI_TOKEN);
}

export function ambilUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const mentah = localStorage.getItem(KUNCI_USER);
  if (!mentah) return null;
  try {
    return JSON.parse(mentah) as AuthUser;
  } catch {
    return null;
  }
}

export function hapusSesi() {
  localStorage.removeItem(KUNCI_TOKEN);
  localStorage.removeItem(KUNCI_USER);
}

/** Halaman awal tiap peran setelah berhasil masuk. */
export function berandaPeran(peran: AuthUser["role"]): string {
  if (peran === "TENANT") return "/tenant";
  if (peran === "OPERATOR") return "/operator";
  return "/buyer/region";
}
