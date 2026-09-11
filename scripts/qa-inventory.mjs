import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set(["node_modules", ".git", ".next", ".turbo", "dist", "build", "generated", ".venv", "__pycache__", ".pytest_cache", "coverage", "htmlcov", "uploads"]);
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name) || entry.name.startsWith("coverage-") || entry.name.startsWith(".env") || /\.(log|pyc|tsbuildinfo)$/.test(entry.name) || [".coverage", "coverage.xml", "coverage.json"].includes(entry.name)) return [];
    const file = join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [relative(root, file).replaceAll("\\", "/")];
  });
}
const all = walk(root).sort();
const owned = all.filter((file) => /^(apps|packages|docs|scripts)\//.test(file));
const runtime = owned.filter((file) => /^(apps\/(api|web|satellite-worker)|packages\/shared)\/src\//.test(file) && /\.(ts|tsx|py)$/.test(file) && !/\.spec\.|\.d\.ts$|\/test\//.test(file));
const pages = all.filter((file) => /^apps\/web\/src\/app\/(?:.*\/)?page\.tsx$/.test(file));
const schema = readFileSync(join(root, "apps/api/prisma/schema.prisma"), "utf8");
const modules = readdirSync(join(root, "apps/api/src/modules"), { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name);
const empty = owned.filter((file) => statSync(join(root, file)).size === 0);
const summary = { runtimeFiles: runtime.length, webPages: pages.length, apiModules: modules.length, prismaModels: [...schema.matchAll(/^model /gm)].length, migrations: all.filter((file) => /^apps\/api\/prisma\/migrations\/.+\/migration\.sql$/.test(file)).length };
const lines = [
  "# Struktur proyek AgroUs — inventaris sumber", "", "Dihasilkan oleh `node scripts/qa-inventory.mjs`. Inventaris struktur bukan klaim setiap baris telah diuji. Dependency, keluaran build, Prisma Client hasil generate, kredensial, unggahan, dan metadata Git tidak dimasukkan.", "",
  "| Bagian | Isi dan tanggung jawab |", "|---|---|",
  "| `apps/web` | Next.js App Router: halaman tenant, buyer, operator, kurir; komponen domain, UI bersama, auth/cart/API client |",
  "| `apps/api` | NestJS modular monolith; controller + DTO + service; Prisma/PostGIS; HTTP, WebSocket, cron |",
  "| `apps/satellite-worker` | Python: provider Sentinel-2, indeks NDVI/NDMI, fenologi, repository SQL, batch job |",
  "| `packages/shared` | Kontrak TypeScript, enum sebagai const object, konstanta bisnis, pemetaan badge |",
  "| `docs` | PRD v2.4, rencana arsitektur v2.2, inventory halaman v2.3, diagram v2.3; audit baru di qa |",
  "| `scripts` | Pemulihan Docker lokal dan alat QA lokal |",
  "| `.github/workflows` | CI QA, keep-alive API, scheduler satelit |",
  "| `.github/agents`, `.github/skills`, `.github/hooks`, `.impeccable`, `.claude` | Alat/asisten pengembangan dan metadata desain; bukan komponen runtime SaaS |",
  "| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `tsconfig.base.json` | Workspace, versi dependency terkunci JS, urutan build/task, konfigurasi bersama |", "",
  `Jumlah terinventarisasi: **${summary.runtimeFiles} file runtime**, **${summary.webPages} page route**, **${summary.apiModules} modul API**, **${summary.prismaModels} model Prisma**, **${summary.migrations} migration SQL**.`, "",
  `Modul API: ${modules.map((name) => "`" + name + "`").join(", ")}.`, "",
  "## Rute halaman yang benar-benar ada", "", "| URL route | Sumber |", "|---|---|",
  ...pages.map((file) => {
    const route = "/" + file.replace("apps/web/src/app/", "").replace(/(^|\/)\([^/]+\)/g, "").replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "").replace(/^\//, "");
    return `| \`${route}\` | [${file}](../../${file}) |`;
  }), "", "## Berkas kosong", "", ...empty.map((file) => `- \`${file}\``), "",
  "File kosong seperti manifest, service worker, atau hook tidak membuktikan fitur tersebut diimplementasikan. `__init__.py` kosong dapat normal untuk paket Python.", "",
  "## Inventaris lengkap aplikasi, paket, dokumen, dan skrip", "", "```text", ...owned, "```", "",
  "## Konfigurasi root dan alat pengembangan", "", "```text", ...all.filter((file) => !/^(apps|packages|docs|scripts)\//.test(file)), "```", "",
];
mkdirSync(join(root, "docs/qa"), { recursive: true });
writeFileSync(join(root, "docs/qa/PROJECT_STRUCTURE.md"), lines.join("\n"));
console.log(JSON.stringify(summary));
