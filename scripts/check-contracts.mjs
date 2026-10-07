import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const files = ["publisher_ledger.py","covenant_book.py","adjudicator.py","mandate_router.py","service_control.py"];
for (const file of files) {
  const source = readFileSync(`contracts/${file}`, "utf8");
  if (!source.includes("py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6")) throw new Error(`${file} does not pin the stable runner`);
  const result = spawnSync("python3", ["-m", "py_compile", `contracts/${file}`], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr}`);
  const lint = spawnSync("genvm-lint", ["check", `contracts/${file}`], { encoding: "utf8", env: { ...process.env, GENVM_VERSION: "v0.2.16" } });
  if (lint.error?.code === "ENOENT") throw new Error("genvm-lint 0.11.0 is required for contract validation");
  if (lint.status !== 0) throw new Error(`${file} (check):\n${lint.stdout}\n${lint.stderr}`);
}
console.log(`Parsed, checked, and validated ${files.length} contract sources.`);
