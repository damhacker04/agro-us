# @agro-os/web

Frontend **Next.js 15 PWA** (App Router). Melayani 3 persona dari 1 basis kode:
- **(tenant)** — dashboard, katalog, manajemen batch, pesanan, rekomendasi tanam (Desktop/Tablet).
- **(buyer)** — pilih kota, katalog terpadu lintas-Tenant, keranjang, checkout, "Pesanan Saya" (Mobile).
- **/scan/[qrToken]** — halaman kurir **ZERO-INSTALL**, target **< 150KB**, buka cepat di 3G.

Deploy: **Vercel**.

> **Status: placeholder.** Scaffold Next.js dikerjakan di Sprint 1.

## Scaffold (nanti, Sprint 1)

```bash
pnpm create next-app@latest apps/web --typescript --tailwind --app --eslint
# + PWA (next-pwa / serwist), shadcn/ui, mapbox-gl
```

## Catatan v2.0
- **PWA** wajib (offline-tolerant untuk input timeline Tenant di kebun).
- **Mapbox GL JS** untuk poligon lahan + live map. JANGAN muat Mapbox penuh di halaman kurir (jaga < 150KB).
- Font: **Fredoka** (heading) + **Poppins** (body). Warna: hijau tua + amber.
- Badge verifikasi: hijau = Terverifikasi, amber = Perlu Ditinjau, abu-abu = Tidak Dapat Diverifikasi.
- Konsumsi kontrak dari `@agro-os/shared`.
