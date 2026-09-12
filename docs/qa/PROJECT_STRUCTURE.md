# Struktur proyek AgroUs — inventaris sumber

Dihasilkan oleh `node scripts/qa-inventory.mjs`. Inventaris struktur bukan klaim setiap baris telah diuji. Dependency, keluaran build, Prisma Client hasil generate, kredensial, unggahan, dan metadata Git tidak dimasukkan.

| Bagian | Isi dan tanggung jawab |
|---|---|
| `apps/web` | Next.js App Router: halaman tenant, buyer, operator, kurir; komponen domain, UI bersama, auth/cart/API client |
| `apps/api` | NestJS modular monolith; controller + DTO + service; Prisma/PostGIS; HTTP, WebSocket, cron |
| `apps/satellite-worker` | Python: provider Sentinel-2, indeks NDVI/NDMI, fenologi, repository SQL, batch job |
| `packages/shared` | Kontrak TypeScript, enum sebagai const object, konstanta bisnis, pemetaan badge |
| `docs` | PRD v2.4, rencana arsitektur v2.2, inventory halaman v2.3, diagram v2.3; audit baru di qa |
| `scripts` | Pemulihan Docker lokal dan alat QA lokal |
| `.github/workflows` | CI QA, keep-alive API, scheduler satelit |
| `.github/agents`, `.github/skills`, `.github/hooks`, `.impeccable`, `.claude` | Alat/asisten pengembangan dan metadata desain; bukan komponen runtime SaaS |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `tsconfig.base.json` | Workspace, versi dependency terkunci JS, urutan build/task, konfigurasi bersama |

Jumlah terinventarisasi: **202 file runtime**, **58 page route**, **15 modul API**, **30 model Prisma**, **18 migration SQL**.

Modul API: `assurance`, `auth`, `buyer`, `catalog`, `intelligence`, `jobs`, `logistics`, `notification`, `operator`, `order`, `quality`, `storage`, `subscription`, `tenant`, `timeline`.

## Rute halaman yang benar-benar ada

| URL route | Sumber |
|---|---|
| `/auth/buyer/login` | [apps/web/src/app/auth/buyer/login/page.tsx](<../../apps/web/src/app/auth/buyer/login/page.tsx>) |
| `/auth/buyer` | [apps/web/src/app/auth/buyer/page.tsx](<../../apps/web/src/app/auth/buyer/page.tsx>) |
| `/auth/operator/login` | [apps/web/src/app/auth/operator/login/page.tsx](<../../apps/web/src/app/auth/operator/login/page.tsx>) |
| `/auth/tenant/login` | [apps/web/src/app/auth/tenant/login/page.tsx](<../../apps/web/src/app/auth/tenant/login/page.tsx>) |
| `/auth/tenant` | [apps/web/src/app/auth/tenant/page.tsx](<../../apps/web/src/app/auth/tenant/page.tsx>) |
| `/auth/verify` | [apps/web/src/app/auth/verify/page.tsx](<../../apps/web/src/app/auth/verify/page.tsx>) |
| `/buyer/cart` | [apps/web/src/app/buyer/(dashboard)/cart/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/cart/page.tsx>) |
| `/buyer/catalog` | [apps/web/src/app/buyer/(dashboard)/catalog/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/catalog/page.tsx>) |
| `/buyer/checkout` | [apps/web/src/app/buyer/(dashboard)/checkout/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/checkout/page.tsx>) |
| `/buyer/orders/[id]` | [apps/web/src/app/buyer/(dashboard)/orders/[id]/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/orders/[id]/page.tsx>) |
| `/buyer/orders/[id]/resolution` | [apps/web/src/app/buyer/(dashboard)/orders/[id]/resolution/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/orders/[id]/resolution/page.tsx>) |
| `/buyer/orders` | [apps/web/src/app/buyer/(dashboard)/orders/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/orders/page.tsx>) |
| `/buyer/payment-success` | [apps/web/src/app/buyer/(dashboard)/payment-success/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/payment-success/page.tsx>) |
| `/buyer/payment` | [apps/web/src/app/buyer/(dashboard)/payment/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/payment/page.tsx>) |
| `/buyer/product/[id]` | [apps/web/src/app/buyer/(dashboard)/product/[id]/page.tsx](<../../apps/web/src/app/buyer/(dashboard)/product/[id]/page.tsx>) |
| `/buyer/region` | [apps/web/src/app/buyer/region/page.tsx](<../../apps/web/src/app/buyer/region/page.tsx>) |
| `/courier/kode-antar` | [apps/web/src/app/courier/kode-antar/page.tsx](<../../apps/web/src/app/courier/kode-antar/page.tsx>) |
| `/courier/tracking` | [apps/web/src/app/courier/tracking/page.tsx](<../../apps/web/src/app/courier/tracking/page.tsx>) |
| `/operator/audit` | [apps/web/src/app/operator/(dashboard)/audit/page.tsx](<../../apps/web/src/app/operator/(dashboard)/audit/page.tsx>) |
| `/operator/claims/[id]` | [apps/web/src/app/operator/(dashboard)/claims/[id]/page.tsx](<../../apps/web/src/app/operator/(dashboard)/claims/[id]/page.tsx>) |
| `/operator/claims` | [apps/web/src/app/operator/(dashboard)/claims/page.tsx](<../../apps/web/src/app/operator/(dashboard)/claims/page.tsx>) |
| `/operator/commodity/[id]` | [apps/web/src/app/operator/(dashboard)/commodity/[id]/page.tsx](<../../apps/web/src/app/operator/(dashboard)/commodity/[id]/page.tsx>) |
| `/operator/commodity` | [apps/web/src/app/operator/(dashboard)/commodity/page.tsx](<../../apps/web/src/app/operator/(dashboard)/commodity/page.tsx>) |
| `/operator/escrow` | [apps/web/src/app/operator/(dashboard)/escrow/page.tsx](<../../apps/web/src/app/operator/(dashboard)/escrow/page.tsx>) |
| `/operator/kewajaran` | [apps/web/src/app/operator/(dashboard)/kewajaran/page.tsx](<../../apps/web/src/app/operator/(dashboard)/kewajaran/page.tsx>) |
| `/operator/legality/[id]` | [apps/web/src/app/operator/(dashboard)/legality/[id]/page.tsx](<../../apps/web/src/app/operator/(dashboard)/legality/[id]/page.tsx>) |
| `/operator/legality` | [apps/web/src/app/operator/(dashboard)/legality/page.tsx](<../../apps/web/src/app/operator/(dashboard)/legality/page.tsx>) |
| `/operator` | [apps/web/src/app/operator/(dashboard)/page.tsx](<../../apps/web/src/app/operator/(dashboard)/page.tsx>) |
| `/operator/satellite/[id]` | [apps/web/src/app/operator/(dashboard)/satellite/[id]/page.tsx](<../../apps/web/src/app/operator/(dashboard)/satellite/[id]/page.tsx>) |
| `/operator/satellite` | [apps/web/src/app/operator/(dashboard)/satellite/page.tsx](<../../apps/web/src/app/operator/(dashboard)/satellite/page.tsx>) |
| `/operator/umur-simpan` | [apps/web/src/app/operator/(dashboard)/umur-simpan/page.tsx](<../../apps/web/src/app/operator/(dashboard)/umur-simpan/page.tsx>) |
| `/operator/zone` | [apps/web/src/app/operator/(dashboard)/zone/page.tsx](<../../apps/web/src/app/operator/(dashboard)/zone/page.tsx>) |
| `/` | [apps/web/src/app/page.tsx](<../../apps/web/src/app/page.tsx>) |
| `/scan/[token]` | [apps/web/src/app/scan/[token]/page.tsx](<../../apps/web/src/app/scan/[token]/page.tsx>) |
| `/tenant/batch/[id]/edit-po` | [apps/web/src/app/tenant/(dashboard)/batch/[id]/edit-po/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/batch/[id]/edit-po/page.tsx>) |
| `/tenant/batch/[id]/kewajaran` | [apps/web/src/app/tenant/(dashboard)/batch/[id]/kewajaran/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/batch/[id]/kewajaran/page.tsx>) |
| `/tenant/batch/[id]` | [apps/web/src/app/tenant/(dashboard)/batch/[id]/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/batch/[id]/page.tsx>) |
| `/tenant/batch/[id]/progress/new` | [apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/page.tsx>) |
| `/tenant/batch/new/mapping` | [apps/web/src/app/tenant/(dashboard)/batch/new/mapping/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/batch/new/mapping/page.tsx>) |
| `/tenant/batch/new` | [apps/web/src/app/tenant/(dashboard)/batch/new/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/batch/new/page.tsx>) |
| `/tenant/batch` | [apps/web/src/app/tenant/(dashboard)/batch/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/batch/page.tsx>) |
| `/tenant/catalog/edit` | [apps/web/src/app/tenant/(dashboard)/catalog/edit/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/catalog/edit/page.tsx>) |
| `/tenant/catalog` | [apps/web/src/app/tenant/(dashboard)/catalog/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/catalog/page.tsx>) |
| `/tenant/finance` | [apps/web/src/app/tenant/(dashboard)/finance/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/finance/page.tsx>) |
| `/tenant/land/confirmation` | [apps/web/src/app/tenant/(dashboard)/land/confirmation/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/land/confirmation/page.tsx>) |
| `/tenant/land/mapping` | [apps/web/src/app/tenant/(dashboard)/land/mapping/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/land/mapping/page.tsx>) |
| `/tenant/land` | [apps/web/src/app/tenant/(dashboard)/land/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/land/page.tsx>) |
| `/tenant/orders/[id]/invoice` | [apps/web/src/app/tenant/(dashboard)/orders/[id]/invoice/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/orders/[id]/invoice/page.tsx>) |
| `/tenant/orders/[id]` | [apps/web/src/app/tenant/(dashboard)/orders/[id]/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/orders/[id]/page.tsx>) |
| `/tenant/orders` | [apps/web/src/app/tenant/(dashboard)/orders/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/orders/page.tsx>) |
| `/tenant` | [apps/web/src/app/tenant/(dashboard)/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/page.tsx>) |
| `/tenant/recommendation` | [apps/web/src/app/tenant/(dashboard)/recommendation/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/recommendation/page.tsx>) |
| `/tenant/reputation` | [apps/web/src/app/tenant/(dashboard)/reputation/page.tsx](<../../apps/web/src/app/tenant/(dashboard)/reputation/page.tsx>) |
| `/tenant/onboarding/confirmation` | [apps/web/src/app/tenant/onboarding/confirmation/page.tsx](<../../apps/web/src/app/tenant/onboarding/confirmation/page.tsx>) |
| `/tenant/onboarding/legal` | [apps/web/src/app/tenant/onboarding/legal/page.tsx](<../../apps/web/src/app/tenant/onboarding/legal/page.tsx>) |
| `/tenant/onboarding/mapping` | [apps/web/src/app/tenant/onboarding/mapping/page.tsx](<../../apps/web/src/app/tenant/onboarding/mapping/page.tsx>) |
| `/tenant/onboarding/profile` | [apps/web/src/app/tenant/onboarding/profile/page.tsx](<../../apps/web/src/app/tenant/onboarding/profile/page.tsx>) |
| `/tenant/onboarding/success` | [apps/web/src/app/tenant/onboarding/success/page.tsx](<../../apps/web/src/app/tenant/onboarding/success/page.tsx>) |

## Berkas kosong

- `apps/satellite-worker/src/__init__.py`
- `apps/satellite-worker/tests/__init__.py`
- `apps/web/components.json`
- `apps/web/public/icons/manifest.json`
- `apps/web/public/icons/sw.js`
- `apps/web/src/app/tenant/batches_page.tsx`
- `apps/web/src/app/tenant/catalog_page.tsx`
- `apps/web/src/app/tenant/dashboard_page.tsx`
- `apps/web/src/app/tenant/orders_page.tsx`
- `apps/web/src/app/tenant/recommendation_page.tsx`
- `apps/web/src/hooks/use_geolocation.ts`
- `apps/web/src/hooks/use_websocket.ts`
- `apps/web/src/lib/format.ts`
- `apps/web/src/lib/utils.ts`
- `apps/web/src/services/api.ts`

File kosong seperti manifest, service worker, atau hook tidak membuktikan fitur tersebut diimplementasikan. `__init__.py` kosong dapat normal untuk paket Python.

## Inventaris lengkap aplikasi, paket, dokumen, dan skrip

```text
apps/api/.gitignore
apps/api/README.md
apps/api/nest-cli.json
apps/api/package.json
apps/api/prisma.config.ts
apps/api/prisma/demo-assets/panen.jpg
apps/api/prisma/demo-assets/pemupukan.jpg
apps/api/prisma/demo-assets/penanaman.jpg
apps/api/prisma/demo-assets/pengairan.jpg
apps/api/prisma/demo-assets/penyiapan-lahan.jpg
apps/api/prisma/demo-assets/pod.jpg
apps/api/prisma/migrations/0_init/migration.sql
apps/api/prisma/migrations/20260728000100_add_otp_requests/migration.sql
apps/api/prisma/migrations/20260728020000_tenant_legality_doc/migration.sql
apps/api/prisma/migrations/20260728040000_commodity_growing_days/migration.sql
apps/api/prisma/migrations/20260728060000_claims_per_order_item/migration.sql
apps/api/prisma/migrations/20260728080000_escrow_alih_substitusi/migration.sql
apps/api/prisma/migrations/20260729000000_demand_signals/migration.sql
apps/api/prisma/migrations/20260801000000_shipment_penerima/migration.sql
apps/api/prisma/migrations/20260807000000_shortfall_seniority/migration.sql
apps/api/prisma/migrations/20260812000000_erd_v23_p0/migration.sql
apps/api/prisma/migrations/20260812010000_erd_v23_p1/migration.sql
apps/api/prisma/migrations/20260812020000_effective_area_backfill/migration.sql
apps/api/prisma/migrations/20260812030000_cap_gugur_integritas/migration.sql
apps/api/prisma/migrations/20260812040000_penilaian_dikonfirmasi/migration.sql
apps/api/prisma/migrations/20260812050000_bersihkan_peak_ndvi/migration.sql
apps/api/prisma/migrations/20260812060000_integritas_kuota_benchmark/migration.sql
apps/api/prisma/migrations/20260812070000_siklus_penyaluran/migration.sql
apps/api/prisma/migrations/20260813000000_umur_simpan/migration.sql
apps/api/prisma/migrations/migration_lock.toml
apps/api/prisma/schema.prisma
apps/api/prisma/seed-demo.ts
apps/api/prisma/seed.ts
apps/api/src/app.module.ts
apps/api/src/health.controller.ts
apps/api/src/main.ts
apps/api/src/modules/assurance/allocation.service.spec.ts
apps/api/src/modules/assurance/allocation.service.ts
apps/api/src/modules/assurance/assurance.controller.ts
apps/api/src/modules/assurance/assurance.module.ts
apps/api/src/modules/assurance/assurance.service.spec.ts
apps/api/src/modules/assurance/assurance.service.ts
apps/api/src/modules/assurance/thresholds.ts
apps/api/src/modules/assurance/yield-assessment.service.spec.ts
apps/api/src/modules/assurance/yield-assessment.service.ts
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.dto.ts
apps/api/src/modules/auth/auth.guard.ts
apps/api/src/modules/auth/auth.module.ts
apps/api/src/modules/auth/auth.service.spec.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/guards.spec.ts
apps/api/src/modules/auth/roles.guard.ts
apps/api/src/modules/buyer/buyer.dto.ts
apps/api/src/modules/buyer/buyer.service.spec.ts
apps/api/src/modules/buyer/buyer.service.ts
apps/api/src/modules/catalog/batch.service.spec.ts
apps/api/src/modules/catalog/batch.service.ts
apps/api/src/modules/catalog/catalog.controller.ts
apps/api/src/modules/catalog/catalog.dto.ts
apps/api/src/modules/catalog/catalog.module.ts
apps/api/src/modules/catalog/catalog.service.spec.ts
apps/api/src/modules/catalog/catalog.service.ts
apps/api/src/modules/catalog/product.service.spec.ts
apps/api/src/modules/catalog/product.service.ts
apps/api/src/modules/intelligence/demand-signal.service.ts
apps/api/src/modules/intelligence/demand.service.ts
apps/api/src/modules/intelligence/intelligence.controller.ts
apps/api/src/modules/intelligence/intelligence.module.ts
apps/api/src/modules/intelligence/recommendation.service.ts
apps/api/src/modules/jobs/jobs.module.ts
apps/api/src/modules/jobs/jobs.service.spec.ts
apps/api/src/modules/jobs/jobs.service.ts
apps/api/src/modules/logistics/claim-window.service.spec.ts
apps/api/src/modules/logistics/claim-window.service.ts
apps/api/src/modules/logistics/courier.service.spec.ts
apps/api/src/modules/logistics/courier.service.ts
apps/api/src/modules/logistics/logistics.controller.ts
apps/api/src/modules/logistics/logistics.dto.ts
apps/api/src/modules/logistics/logistics.module.ts
apps/api/src/modules/logistics/pod.service.spec.ts
apps/api/src/modules/logistics/pod.service.ts
apps/api/src/modules/logistics/qr.service.spec.ts
apps/api/src/modules/logistics/qr.service.ts
apps/api/src/modules/logistics/tracking.gateway.spec.ts
apps/api/src/modules/logistics/tracking.gateway.ts
apps/api/src/modules/notification/notification.gateway.ts
apps/api/src/modules/notification/notification.module.ts
apps/api/src/modules/notification/notification.service.spec.ts
apps/api/src/modules/notification/notification.service.ts
apps/api/src/modules/notification/sms.service.ts
apps/api/src/modules/operator/operator.controller.ts
apps/api/src/modules/operator/operator.dto.ts
apps/api/src/modules/operator/operator.module.ts
apps/api/src/modules/operator/operator.service.ts
apps/api/src/modules/order/escrow.service.spec.ts
apps/api/src/modules/order/escrow.service.ts
apps/api/src/modules/order/order.controller.ts
apps/api/src/modules/order/order.dto.ts
apps/api/src/modules/order/order.module.ts
apps/api/src/modules/order/order.service.spec.ts
apps/api/src/modules/order/order.service.ts
apps/api/src/modules/order/payment.service.spec.ts
apps/api/src/modules/order/payment.service.ts
apps/api/src/modules/order/tenant-order.service.ts
apps/api/src/modules/order/webhook-signature.spec.ts
apps/api/src/modules/order/webhook-signature.ts
apps/api/src/modules/quality/claim.service.spec.ts
apps/api/src/modules/quality/claim.service.ts
apps/api/src/modules/quality/quality.controller.ts
apps/api/src/modules/quality/quality.dto.ts
apps/api/src/modules/quality/quality.module.ts
apps/api/src/modules/quality/settlement.service.spec.ts
apps/api/src/modules/quality/settlement.service.ts
apps/api/src/modules/quality/umur-simpan.service.spec.ts
apps/api/src/modules/quality/umur-simpan.service.ts
apps/api/src/modules/storage/object-key.spec.ts
apps/api/src/modules/storage/object-key.ts
apps/api/src/modules/storage/s3-storage.service.spec.ts
apps/api/src/modules/storage/s3-storage.service.ts
apps/api/src/modules/storage/storage.module.spec.ts
apps/api/src/modules/storage/storage.module.ts
apps/api/src/modules/storage/storage.service.spec.ts
apps/api/src/modules/storage/storage.service.ts
apps/api/src/modules/storage/upload.controller.ts
apps/api/src/modules/storage/uploaded-url.validator.spec.ts
apps/api/src/modules/storage/uploaded-url.validator.ts
apps/api/src/modules/subscription/subscription.controller.ts
apps/api/src/modules/subscription/subscription.module.ts
apps/api/src/modules/subscription/subscription.service.spec.ts
apps/api/src/modules/subscription/subscription.service.ts
apps/api/src/modules/tenant/land-plot.service.ts
apps/api/src/modules/tenant/legality.service.spec.ts
apps/api/src/modules/tenant/legality.service.ts
apps/api/src/modules/tenant/tenant.controller.ts
apps/api/src/modules/tenant/tenant.dto.ts
apps/api/src/modules/tenant/tenant.module.ts
apps/api/src/modules/tenant/tenant.service.spec.ts
apps/api/src/modules/tenant/tenant.service.ts
apps/api/src/modules/timeline/anchor.service.spec.ts
apps/api/src/modules/timeline/anchor.service.ts
apps/api/src/modules/timeline/harvest.service.spec.ts
apps/api/src/modules/timeline/harvest.service.ts
apps/api/src/modules/timeline/hash.util.spec.ts
apps/api/src/modules/timeline/hash.util.ts
apps/api/src/modules/timeline/ndvi.service.ts
apps/api/src/modules/timeline/timeline.controller.ts
apps/api/src/modules/timeline/timeline.dto.ts
apps/api/src/modules/timeline/timeline.module.ts
apps/api/src/modules/timeline/timeline.service.spec.ts
apps/api/src/modules/timeline/timeline.service.ts
apps/api/src/prisma/prisma.module.ts
apps/api/src/prisma/prisma.service.ts
apps/api/tsconfig.build.json
apps/api/tsconfig.json
apps/api/vitest.config.ts
apps/satellite-worker/.gitignore
apps/satellite-worker/README.md
apps/satellite-worker/pytest.ini
apps/satellite-worker/requirements-dev.txt
apps/satellite-worker/requirements.txt
apps/satellite-worker/scripts/ambil_citra_landing.py
apps/satellite-worker/src/__init__.py
apps/satellite-worker/src/demo_curve.py
apps/satellite-worker/src/indices.py
apps/satellite-worker/src/main.py
apps/satellite-worker/src/phenology.py
apps/satellite-worker/src/providers.py
apps/satellite-worker/src/repository.py
apps/satellite-worker/src/stac_provider.py
apps/satellite-worker/tests/__init__.py
apps/satellite-worker/tests/conftest.py
apps/satellite-worker/tests/test_demo_curve.py
apps/satellite-worker/tests/test_indices_providers.py
apps/satellite-worker/tests/test_known_regressions.py
apps/satellite-worker/tests/test_main.py
apps/satellite-worker/tests/test_phenology.py
apps/satellite-worker/tests/test_phenology_edges.py
apps/satellite-worker/tests/test_repository.py
apps/satellite-worker/tests/test_stac_provider.py
apps/web/.impeccable/design.json
apps/web/.impeccable/hook.cache.json
apps/web/.impeccable/questions/09fdb463.state.json
apps/web/.impeccable/questions/3601454c.answer.json
apps/web/.impeccable/questions/3601454c.state.json
apps/web/.impeccable/questions/dunia-terpilih.json
apps/web/DESIGN.md
apps/web/MIGRASI.md
apps/web/PRODUCT.md
apps/web/README.md
apps/web/components.json
apps/web/next-env.d.ts
apps/web/next.config.mjs
apps/web/package.json
apps/web/postcss.config.mjs
apps/web/public/icons/manifest.json
apps/web/public/icons/sw.js
apps/web/public/logo-text.png
apps/web/public/logo.png
apps/web/public/satelit/pujon-panen.png
apps/web/public/satelit/pujon-puncak.png
apps/web/public/satelit/sumber.json
apps/web/scripts/buat-guilloche.mjs
apps/web/src/app/auth/buyer/login/page.tsx
apps/web/src/app/auth/buyer/page.tsx
apps/web/src/app/auth/operator/login/page.tsx
apps/web/src/app/auth/tenant/login/page.tsx
apps/web/src/app/auth/tenant/page.tsx
apps/web/src/app/auth/verify/auth-flow.spec.tsx
apps/web/src/app/auth/verify/page.tsx
apps/web/src/app/buyer/(dashboard)/cart/page.tsx
apps/web/src/app/buyer/(dashboard)/catalog/page.tsx
apps/web/src/app/buyer/(dashboard)/checkout/checkout-flow.spec.tsx
apps/web/src/app/buyer/(dashboard)/checkout/page.tsx
apps/web/src/app/buyer/(dashboard)/layout.tsx
apps/web/src/app/buyer/(dashboard)/orders/[id]/page.tsx
apps/web/src/app/buyer/(dashboard)/orders/[id]/resolution/page.tsx
apps/web/src/app/buyer/(dashboard)/orders/page.tsx
apps/web/src/app/buyer/(dashboard)/payment-success/page.tsx
apps/web/src/app/buyer/(dashboard)/payment/page.tsx
apps/web/src/app/buyer/(dashboard)/payment/payment-flow.spec.tsx
apps/web/src/app/buyer/(dashboard)/product/[id]/page.tsx
apps/web/src/app/buyer/layout.tsx
apps/web/src/app/buyer/region/page.tsx
apps/web/src/app/buyer/region/region-flow.spec.tsx
apps/web/src/app/courier/kode-antar/page.tsx
apps/web/src/app/courier/tracking/page.tsx
apps/web/src/app/global.css
apps/web/src/app/layout.tsx
apps/web/src/app/operator/(dashboard)/audit/page.tsx
apps/web/src/app/operator/(dashboard)/claims/[id]/page.tsx
apps/web/src/app/operator/(dashboard)/claims/page.tsx
apps/web/src/app/operator/(dashboard)/commodity/[id]/page.tsx
apps/web/src/app/operator/(dashboard)/commodity/page.tsx
apps/web/src/app/operator/(dashboard)/escrow/page.tsx
apps/web/src/app/operator/(dashboard)/kewajaran/page.tsx
apps/web/src/app/operator/(dashboard)/layout.tsx
apps/web/src/app/operator/(dashboard)/legality/[id]/page.tsx
apps/web/src/app/operator/(dashboard)/legality/page.tsx
apps/web/src/app/operator/(dashboard)/page.tsx
apps/web/src/app/operator/(dashboard)/satellite/[id]/page.tsx
apps/web/src/app/operator/(dashboard)/satellite/page.tsx
apps/web/src/app/operator/(dashboard)/umur-simpan/page.tsx
apps/web/src/app/operator/(dashboard)/zone/page.tsx
apps/web/src/app/page.tsx
apps/web/src/app/scan/[token]/layout.tsx
apps/web/src/app/scan/[token]/page.tsx
apps/web/src/app/tenant/(dashboard)/batch/[id]/edit-po/page.tsx
apps/web/src/app/tenant/(dashboard)/batch/[id]/kewajaran/page.tsx
apps/web/src/app/tenant/(dashboard)/batch/[id]/page.tsx
apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/PenilaianPanen.spec.tsx
apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/PenilaianPanen.tsx
apps/web/src/app/tenant/(dashboard)/batch/[id]/progress/new/page.tsx
apps/web/src/app/tenant/(dashboard)/batch/new/mapping/page.tsx
apps/web/src/app/tenant/(dashboard)/batch/new/page.tsx
apps/web/src/app/tenant/(dashboard)/batch/page.tsx
apps/web/src/app/tenant/(dashboard)/catalog/edit/page.tsx
apps/web/src/app/tenant/(dashboard)/catalog/page.tsx
apps/web/src/app/tenant/(dashboard)/finance/page.tsx
apps/web/src/app/tenant/(dashboard)/land/confirmation/page.tsx
apps/web/src/app/tenant/(dashboard)/land/mapping/page.tsx
apps/web/src/app/tenant/(dashboard)/land/page.tsx
apps/web/src/app/tenant/(dashboard)/layout.tsx
apps/web/src/app/tenant/(dashboard)/orders/[id]/invoice/page.tsx
apps/web/src/app/tenant/(dashboard)/orders/[id]/page.tsx
apps/web/src/app/tenant/(dashboard)/orders/page.tsx
apps/web/src/app/tenant/(dashboard)/page.tsx
apps/web/src/app/tenant/(dashboard)/recommendation/page.tsx
apps/web/src/app/tenant/(dashboard)/reputation/page.tsx
apps/web/src/app/tenant/batches_page.tsx
apps/web/src/app/tenant/catalog_page.tsx
apps/web/src/app/tenant/dashboard_page.tsx
apps/web/src/app/tenant/layout.tsx
apps/web/src/app/tenant/onboarding/confirmation/page.tsx
apps/web/src/app/tenant/onboarding/layout.tsx
apps/web/src/app/tenant/onboarding/legal/page.tsx
apps/web/src/app/tenant/onboarding/mapping/page.tsx
apps/web/src/app/tenant/onboarding/profile/page.tsx
apps/web/src/app/tenant/onboarding/success/page.tsx
apps/web/src/app/tenant/orders_page.tsx
apps/web/src/app/tenant/recommendation_page.tsx
apps/web/src/components/FormMasuk.tsx
apps/web/src/components/PetaLahan.spec.tsx
apps/web/src/components/PetaLahan.tsx
apps/web/src/components/bagian.tsx
apps/web/src/components/domain-display.spec.tsx
apps/web/src/components/entri-escrow.ts
apps/web/src/components/foto-bukti.tsx
apps/web/src/components/guilloche.tsx
apps/web/src/components/kegiatan.ts
apps/web/src/components/komoditas.ts
apps/web/src/components/kurva-ndvi-batch.tsx
apps/web/src/components/kurva-ndvi.tsx
apps/web/src/components/status-legalitas.tsx
apps/web/src/components/tahap-pengiriman.tsx
apps/web/src/components/tanda-verifikasi.tsx
apps/web/src/hooks/use_geolocation.ts
apps/web/src/hooks/use_websocket.ts
apps/web/src/lib/api.spec.ts
apps/web/src/lib/api.ts
apps/web/src/lib/auth.spec.ts
apps/web/src/lib/auth.ts
apps/web/src/lib/format-id.spec.ts
apps/web/src/lib/format-id.ts
apps/web/src/lib/format.ts
apps/web/src/lib/guilloche-paths.ts
apps/web/src/lib/keranjang.spec.ts
apps/web/src/lib/keranjang.ts
apps/web/src/lib/known-regressions.spec.ts
apps/web/src/lib/sertifikat.ts
apps/web/src/lib/utils.ts
apps/web/src/services/api.ts
apps/web/src/test/browser.ts
apps/web/src/ui/accessibility.spec.tsx
apps/web/src/ui/cangkang.tsx
apps/web/src/ui/cn.spec.ts
apps/web/src/ui/cn.ts
apps/web/src/ui/halaman.tsx
apps/web/src/ui/ikon.tsx
apps/web/src/ui/index.ts
apps/web/src/ui/keadaan.tsx
apps/web/src/ui/kendali.tsx
apps/web/src/ui/medan.tsx
apps/web/src/ui/nada.ts
apps/web/src/ui/panel.tsx
apps/web/src/ui/status.tsx
apps/web/src/ui/teks.tsx
apps/web/tailwind.config.ts
apps/web/tsconfig.json
apps/web/vitest.config.ts
docs/ARCHITECTURE_PLAN.md
docs/CHANGELOG.md
docs/PAGE_INVENTORY_v2.3.md
docs/PRD.md
docs/diagrams/01-use-case.md
docs/diagrams/02-activity.md
docs/diagrams/03-user-flow.md
docs/diagrams/04b-sequence-harvest.md
docs/diagrams/05-erd.md
docs/diagrams/06-architecture-as-built.md
docs/qa/AUDIT_TCC_2026.md
docs/qa/BACKEND_AUDIT.md
docs/qa/FRONTEND_AUDIT.md
docs/qa/PROJECT_STRUCTURE.md
docs/qa/SATELLITE_AUDIT.md
docs/qa/TEST_RESULTS.md
docs/qa/USER_GUIDE.md
packages/shared/package.json
packages/shared/src/index.ts
packages/shared/tests/verification-badge.spec.ts
packages/shared/tsconfig.build.json
packages/shared/tsconfig.json
packages/shared/tsconfig.test.json
packages/shared/vitest.config.ts
scripts/fix-docker.ps1
scripts/qa-inventory.mjs
scripts/qa.mjs
```

## Konfigurasi root dan alat pengembangan

```text
.claude/launch.json
.claude/settings.local.json
.claude/skills/impeccable/SKILL.md
.claude/skills/impeccable/reference/adapt.md
.claude/skills/impeccable/reference/adapt.native.md
.claude/skills/impeccable/reference/android.md
.claude/skills/impeccable/reference/animate.md
.claude/skills/impeccable/reference/audit.md
.claude/skills/impeccable/reference/audit.native.md
.claude/skills/impeccable/reference/bolder.md
.claude/skills/impeccable/reference/clarify.md
.claude/skills/impeccable/reference/colorize.md
.claude/skills/impeccable/reference/craft-floor.md
.claude/skills/impeccable/reference/craft.md
.claude/skills/impeccable/reference/critique.md
.claude/skills/impeccable/reference/degraded/asset-producer.md
.claude/skills/impeccable/reference/degraded/documenter.md
.claude/skills/impeccable/reference/degraded/finish-reviewer.md
.claude/skills/impeccable/reference/degraded/manual-edit-applier.md
.claude/skills/impeccable/reference/delight.md
.claude/skills/impeccable/reference/distill.md
.claude/skills/impeccable/reference/doctor.md
.claude/skills/impeccable/reference/document.md
.claude/skills/impeccable/reference/extract.md
.claude/skills/impeccable/reference/harden.md
.claude/skills/impeccable/reference/hooks.md
.claude/skills/impeccable/reference/init.md
.claude/skills/impeccable/reference/ios.md
.claude/skills/impeccable/reference/layout.md
.claude/skills/impeccable/reference/live-setup.md
.claude/skills/impeccable/reference/live.md
.claude/skills/impeccable/reference/new-work.md
.claude/skills/impeccable/reference/onboard.md
.claude/skills/impeccable/reference/operate.md
.claude/skills/impeccable/reference/optimize.md
.claude/skills/impeccable/reference/overdrive.md
.claude/skills/impeccable/reference/polish.md
.claude/skills/impeccable/reference/quieter.md
.claude/skills/impeccable/reference/routing.md
.claude/skills/impeccable/reference/shape.md
.claude/skills/impeccable/reference/typeset.md
.claude/skills/impeccable/reference/visualize.md
.claude/skills/impeccable/scripts/command-metadata.json
.claude/skills/impeccable/scripts/concept-seed.mjs
.claude/skills/impeccable/scripts/context-signals.mjs
.claude/skills/impeccable/scripts/context.mjs
.claude/skills/impeccable/scripts/critique-storage.mjs
.claude/skills/impeccable/scripts/detect-csp.mjs
.claude/skills/impeccable/scripts/detect.mjs
.claude/skills/impeccable/scripts/detector/browser/injected/index.mjs
.claude/skills/impeccable/scripts/detector/cli/main.mjs
.claude/skills/impeccable/scripts/detector/design-system.mjs
.claude/skills/impeccable/scripts/detector/detect-antipatterns-browser.js
.claude/skills/impeccable/scripts/detector/detect-antipatterns.mjs
.claude/skills/impeccable/scripts/detector/engines/browser/detect-url.mjs
.claude/skills/impeccable/scripts/detector/engines/regex/detect-text.mjs
.claude/skills/impeccable/scripts/detector/engines/static-html/css-cascade.mjs
.claude/skills/impeccable/scripts/detector/engines/static-html/detect-html.mjs
.claude/skills/impeccable/scripts/detector/engines/visual/screenshot-contrast.mjs
.claude/skills/impeccable/scripts/detector/findings.mjs
.claude/skills/impeccable/scripts/detector/node/file-system.mjs
.claude/skills/impeccable/scripts/detector/profile/profiler.mjs
.claude/skills/impeccable/scripts/detector/registry/antipatterns.mjs
.claude/skills/impeccable/scripts/detector/rules/checks.mjs
.claude/skills/impeccable/scripts/detector/shared/color.mjs
.claude/skills/impeccable/scripts/detector/shared/constants.mjs
.claude/skills/impeccable/scripts/detector/shared/fonts.mjs
.claude/skills/impeccable/scripts/detector/shared/inline-ignores.mjs
.claude/skills/impeccable/scripts/detector/shared/page.mjs
.claude/skills/impeccable/scripts/doctor.mjs
.claude/skills/impeccable/scripts/embed-prompt.mjs
.claude/skills/impeccable/scripts/generate-image.mjs
.claude/skills/impeccable/scripts/hook-admin.mjs
.claude/skills/impeccable/scripts/hook-before-edit.mjs
.claude/skills/impeccable/scripts/hook-lib.mjs
.claude/skills/impeccable/scripts/hook.mjs
.claude/skills/impeccable/scripts/lib/artifact-schema.mjs
.claude/skills/impeccable/scripts/lib/composition-catalog.mjs
.claude/skills/impeccable/scripts/lib/concept-catalog.mjs
.claude/skills/impeccable/scripts/lib/design-parser.mjs
.claude/skills/impeccable/scripts/lib/impeccable-config.mjs
.claude/skills/impeccable/scripts/lib/impeccable-paths.mjs
.claude/skills/impeccable/scripts/lib/is-generated.mjs
.claude/skills/impeccable/scripts/lib/provider.mjs
.claude/skills/impeccable/scripts/lib/roll-selection.mjs
.claude/skills/impeccable/scripts/lib/staleness-deep.mjs
.claude/skills/impeccable/scripts/lib/staleness-notice.mjs
.claude/skills/impeccable/scripts/lib/staleness.mjs
.claude/skills/impeccable/scripts/lib/surface-briefs.mjs
.claude/skills/impeccable/scripts/lib/target-args.mjs
.claude/skills/impeccable/scripts/lib/target-slug.mjs
.claude/skills/impeccable/scripts/lib/template-extensions.mjs
.claude/skills/impeccable/scripts/live-accept.mjs
.claude/skills/impeccable/scripts/live-browser-dom.js
.claude/skills/impeccable/scripts/live-browser-session.js
.claude/skills/impeccable/scripts/live-browser.js
.claude/skills/impeccable/scripts/live-commit-manual-edits.mjs
.claude/skills/impeccable/scripts/live-complete.mjs
.claude/skills/impeccable/scripts/live-copy-edit-agent.mjs
.claude/skills/impeccable/scripts/live-discard-manual-edits.mjs
.claude/skills/impeccable/scripts/live-inject.mjs
.claude/skills/impeccable/scripts/live-insert.mjs
.claude/skills/impeccable/scripts/live-manual-edit-evidence.mjs
.claude/skills/impeccable/scripts/live-poll.mjs
.claude/skills/impeccable/scripts/live-resume.mjs
.claude/skills/impeccable/scripts/live-server.mjs
.claude/skills/impeccable/scripts/live-status.mjs
.claude/skills/impeccable/scripts/live-target.mjs
.claude/skills/impeccable/scripts/live-wrap.mjs
.claude/skills/impeccable/scripts/live.mjs
.claude/skills/impeccable/scripts/live/accept-css.mjs
.claude/skills/impeccable/scripts/live/accept-verify.mjs
.claude/skills/impeccable/scripts/live/browser-script-parts.mjs
.claude/skills/impeccable/scripts/live/completion.mjs
.claude/skills/impeccable/scripts/live/event-validation.mjs
.claude/skills/impeccable/scripts/live/frameworks/astro.mjs
.claude/skills/impeccable/scripts/live/frameworks/detect-utils.mjs
.claude/skills/impeccable/scripts/live/frameworks/index.mjs
.claude/skills/impeccable/scripts/live/frameworks/journal.mjs
.claude/skills/impeccable/scripts/live/frameworks/nextjs.mjs
.claude/skills/impeccable/scripts/live/frameworks/nuxt.mjs
.claude/skills/impeccable/scripts/live/frameworks/script-src.mjs
.claude/skills/impeccable/scripts/live/frameworks/static-html.mjs
.claude/skills/impeccable/scripts/live/frameworks/sveltekit.mjs
.claude/skills/impeccable/scripts/live/frameworks/tag-strategy.mjs
.claude/skills/impeccable/scripts/live/frameworks/tanstack-start.mjs
.claude/skills/impeccable/scripts/live/frameworks/vite-generic.mjs
.claude/skills/impeccable/scripts/live/generation-preflight.mjs
.claude/skills/impeccable/scripts/live/insert-ui.mjs
.claude/skills/impeccable/scripts/live/instructions.mjs
.claude/skills/impeccable/scripts/live/manual-apply.mjs
.claude/skills/impeccable/scripts/live/manual-edit-routes.mjs
.claude/skills/impeccable/scripts/live/manual-edits-buffer.mjs
.claude/skills/impeccable/scripts/live/poll-lanes.mjs
.claude/skills/impeccable/scripts/live/roots.mjs
.claude/skills/impeccable/scripts/live/session-store.mjs
.claude/skills/impeccable/scripts/live/source-lock.mjs
.claude/skills/impeccable/scripts/live/source-search.mjs
.claude/skills/impeccable/scripts/live/svelte-ast.mjs
.claude/skills/impeccable/scripts/live/svelte-component.mjs
.claude/skills/impeccable/scripts/live/sveltekit-adapter.mjs
.claude/skills/impeccable/scripts/live/tanstack-adapter.mjs
.claude/skills/impeccable/scripts/live/ui-core.mjs
.claude/skills/impeccable/scripts/live/vocabulary.mjs
.claude/skills/impeccable/scripts/modern-screenshot.umd.js
.claude/skills/impeccable/scripts/palette.mjs
.claude/skills/impeccable/scripts/pin.mjs
.claude/skills/impeccable/scripts/serve-question.mjs
.claude/skills/impeccable/scripts/surface-brief.mjs
.gitattributes
.github/agents/impeccable-asset-producer.agent.md
.github/agents/impeccable-documenter.agent.md
.github/agents/impeccable-finish-reviewer.agent.md
.github/agents/impeccable-manual-edit-applier.agent.md
.github/hooks/impeccable.json
.github/skills/impeccable/SKILL.md
.github/skills/impeccable/reference/adapt.md
.github/skills/impeccable/reference/adapt.native.md
.github/skills/impeccable/reference/android.md
.github/skills/impeccable/reference/animate.md
.github/skills/impeccable/reference/audit.md
.github/skills/impeccable/reference/audit.native.md
.github/skills/impeccable/reference/bolder.md
.github/skills/impeccable/reference/clarify.md
.github/skills/impeccable/reference/colorize.md
.github/skills/impeccable/reference/craft-floor.md
.github/skills/impeccable/reference/craft.md
.github/skills/impeccable/reference/critique.md
.github/skills/impeccable/reference/degraded/asset-producer.md
.github/skills/impeccable/reference/degraded/documenter.md
.github/skills/impeccable/reference/degraded/finish-reviewer.md
.github/skills/impeccable/reference/degraded/manual-edit-applier.md
.github/skills/impeccable/reference/delight.md
.github/skills/impeccable/reference/distill.md
.github/skills/impeccable/reference/doctor.md
.github/skills/impeccable/reference/document.md
.github/skills/impeccable/reference/extract.md
.github/skills/impeccable/reference/harden.md
.github/skills/impeccable/reference/hooks.md
.github/skills/impeccable/reference/init.md
.github/skills/impeccable/reference/ios.md
.github/skills/impeccable/reference/layout.md
.github/skills/impeccable/reference/live-setup.md
.github/skills/impeccable/reference/live.md
.github/skills/impeccable/reference/new-work.md
.github/skills/impeccable/reference/onboard.md
.github/skills/impeccable/reference/operate.md
.github/skills/impeccable/reference/optimize.md
.github/skills/impeccable/reference/overdrive.md
.github/skills/impeccable/reference/polish.md
.github/skills/impeccable/reference/quieter.md
.github/skills/impeccable/reference/routing.md
.github/skills/impeccable/reference/shape.md
.github/skills/impeccable/reference/typeset.md
.github/skills/impeccable/reference/visualize.md
.github/skills/impeccable/scripts/command-metadata.json
.github/skills/impeccable/scripts/concept-seed.mjs
.github/skills/impeccable/scripts/context-signals.mjs
.github/skills/impeccable/scripts/context.mjs
.github/skills/impeccable/scripts/critique-storage.mjs
.github/skills/impeccable/scripts/detect-csp.mjs
.github/skills/impeccable/scripts/detect.mjs
.github/skills/impeccable/scripts/detector/browser/injected/index.mjs
.github/skills/impeccable/scripts/detector/cli/main.mjs
.github/skills/impeccable/scripts/detector/design-system.mjs
.github/skills/impeccable/scripts/detector/detect-antipatterns-browser.js
.github/skills/impeccable/scripts/detector/detect-antipatterns.mjs
.github/skills/impeccable/scripts/detector/engines/browser/detect-url.mjs
.github/skills/impeccable/scripts/detector/engines/regex/detect-text.mjs
.github/skills/impeccable/scripts/detector/engines/static-html/css-cascade.mjs
.github/skills/impeccable/scripts/detector/engines/static-html/detect-html.mjs
.github/skills/impeccable/scripts/detector/engines/visual/screenshot-contrast.mjs
.github/skills/impeccable/scripts/detector/findings.mjs
.github/skills/impeccable/scripts/detector/node/file-system.mjs
.github/skills/impeccable/scripts/detector/profile/profiler.mjs
.github/skills/impeccable/scripts/detector/registry/antipatterns.mjs
.github/skills/impeccable/scripts/detector/rules/checks.mjs
.github/skills/impeccable/scripts/detector/shared/color.mjs
.github/skills/impeccable/scripts/detector/shared/constants.mjs
.github/skills/impeccable/scripts/detector/shared/fonts.mjs
.github/skills/impeccable/scripts/detector/shared/inline-ignores.mjs
.github/skills/impeccable/scripts/detector/shared/page.mjs
.github/skills/impeccable/scripts/doctor.mjs
.github/skills/impeccable/scripts/embed-prompt.mjs
.github/skills/impeccable/scripts/generate-image.mjs
.github/skills/impeccable/scripts/hook-admin.mjs
.github/skills/impeccable/scripts/hook-before-edit.mjs
.github/skills/impeccable/scripts/hook-lib.mjs
.github/skills/impeccable/scripts/hook.mjs
.github/skills/impeccable/scripts/lib/artifact-schema.mjs
.github/skills/impeccable/scripts/lib/composition-catalog.mjs
.github/skills/impeccable/scripts/lib/concept-catalog.mjs
.github/skills/impeccable/scripts/lib/design-parser.mjs
.github/skills/impeccable/scripts/lib/impeccable-config.mjs
.github/skills/impeccable/scripts/lib/impeccable-paths.mjs
.github/skills/impeccable/scripts/lib/is-generated.mjs
.github/skills/impeccable/scripts/lib/provider.mjs
.github/skills/impeccable/scripts/lib/roll-selection.mjs
.github/skills/impeccable/scripts/lib/staleness-deep.mjs
.github/skills/impeccable/scripts/lib/staleness-notice.mjs
.github/skills/impeccable/scripts/lib/staleness.mjs
.github/skills/impeccable/scripts/lib/surface-briefs.mjs
.github/skills/impeccable/scripts/lib/target-args.mjs
.github/skills/impeccable/scripts/lib/target-slug.mjs
.github/skills/impeccable/scripts/lib/template-extensions.mjs
.github/skills/impeccable/scripts/live-accept.mjs
.github/skills/impeccable/scripts/live-browser-dom.js
.github/skills/impeccable/scripts/live-browser-session.js
.github/skills/impeccable/scripts/live-browser.js
.github/skills/impeccable/scripts/live-commit-manual-edits.mjs
.github/skills/impeccable/scripts/live-complete.mjs
.github/skills/impeccable/scripts/live-copy-edit-agent.mjs
.github/skills/impeccable/scripts/live-discard-manual-edits.mjs
.github/skills/impeccable/scripts/live-inject.mjs
.github/skills/impeccable/scripts/live-insert.mjs
.github/skills/impeccable/scripts/live-manual-edit-evidence.mjs
.github/skills/impeccable/scripts/live-poll.mjs
.github/skills/impeccable/scripts/live-resume.mjs
.github/skills/impeccable/scripts/live-server.mjs
.github/skills/impeccable/scripts/live-status.mjs
.github/skills/impeccable/scripts/live-target.mjs
.github/skills/impeccable/scripts/live-wrap.mjs
.github/skills/impeccable/scripts/live.mjs
.github/skills/impeccable/scripts/live/accept-css.mjs
.github/skills/impeccable/scripts/live/accept-verify.mjs
.github/skills/impeccable/scripts/live/browser-script-parts.mjs
.github/skills/impeccable/scripts/live/completion.mjs
.github/skills/impeccable/scripts/live/event-validation.mjs
.github/skills/impeccable/scripts/live/frameworks/astro.mjs
.github/skills/impeccable/scripts/live/frameworks/detect-utils.mjs
.github/skills/impeccable/scripts/live/frameworks/index.mjs
.github/skills/impeccable/scripts/live/frameworks/journal.mjs
.github/skills/impeccable/scripts/live/frameworks/nextjs.mjs
.github/skills/impeccable/scripts/live/frameworks/nuxt.mjs
.github/skills/impeccable/scripts/live/frameworks/script-src.mjs
.github/skills/impeccable/scripts/live/frameworks/static-html.mjs
.github/skills/impeccable/scripts/live/frameworks/sveltekit.mjs
.github/skills/impeccable/scripts/live/frameworks/tag-strategy.mjs
.github/skills/impeccable/scripts/live/frameworks/tanstack-start.mjs
.github/skills/impeccable/scripts/live/frameworks/vite-generic.mjs
.github/skills/impeccable/scripts/live/generation-preflight.mjs
.github/skills/impeccable/scripts/live/insert-ui.mjs
.github/skills/impeccable/scripts/live/instructions.mjs
.github/skills/impeccable/scripts/live/manual-apply.mjs
.github/skills/impeccable/scripts/live/manual-edit-routes.mjs
.github/skills/impeccable/scripts/live/manual-edits-buffer.mjs
.github/skills/impeccable/scripts/live/poll-lanes.mjs
.github/skills/impeccable/scripts/live/roots.mjs
.github/skills/impeccable/scripts/live/session-store.mjs
.github/skills/impeccable/scripts/live/source-lock.mjs
.github/skills/impeccable/scripts/live/source-search.mjs
.github/skills/impeccable/scripts/live/svelte-ast.mjs
.github/skills/impeccable/scripts/live/svelte-component.mjs
.github/skills/impeccable/scripts/live/sveltekit-adapter.mjs
.github/skills/impeccable/scripts/live/tanstack-adapter.mjs
.github/skills/impeccable/scripts/live/ui-core.mjs
.github/skills/impeccable/scripts/live/vocabulary.mjs
.github/skills/impeccable/scripts/modern-screenshot.umd.js
.github/skills/impeccable/scripts/palette.mjs
.github/skills/impeccable/scripts/pin.mjs
.github/skills/impeccable/scripts/serve-question.mjs
.github/skills/impeccable/scripts/surface-brief.mjs
.github/workflows/keep-alive.yml
.github/workflows/qa.yml
.github/workflows/satellite-verify.yml
.gitignore
.impeccable/config.local.json
.impeccable/hook.cache.json
README.md
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
turbo.json
```
