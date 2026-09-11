import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Run local test tools directly: no shell interpolation, database or external service.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
if (!["worker", "regressions"].includes(mode)) {
  console.error("Usage: node scripts/qa.mjs worker|regressions");
  process.exit(2);
}
const worker = join(root, "apps/satellite-worker");
const localPython = join(worker, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const python = process.env.QA_PYTHON || (existsSync(localPython) ? localPython : "python");
const env = { ...process.env, ...(mode === "regressions" ? { QA_ENFORCE_REGRESSIONS: "1" } : {}) };
const tasks = mode === "worker" ? [] : ["apps/api", "apps/web", "packages/shared"].map((app) => ({
  name: app.split("/").at(-1),
  executable: process.execPath,
  args: [join(root, `${app}/node_modules/vitest/vitest.mjs`), "run"],
  cwd: join(root, app),
}));
tasks.push({ name: "satellite-worker", executable: python, args: ["-m", "pytest", "-q", ...(mode === "regressions" ? ["--no-cov"] : [])], cwd: worker });
let failed = false;
for (const task of tasks) {
  console.log(`\nQA ${mode}: ${task.name}`);
  const result = spawnSync(task.executable, task.args, { cwd: task.cwd, env, stdio: "inherit", windowsHide: true });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
