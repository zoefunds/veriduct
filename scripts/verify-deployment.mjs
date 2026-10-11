import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import manifest from "../deployment-manifest.public.json" with { type: "json" };

const writeReport = process.argv.includes("--write-report");
const client = createClient({ chain: studionet, endpoint: manifest.rpc });
const sha256 = value => createHash("sha256").update(value).digest("hex");
const checks = [];
const assert = (name, condition, evidence) => {
  checks.push({ name, passed: Boolean(condition), evidence });
  if (!condition) throw new Error(`${name}: ${evidence}`);
};
const readJson = async (address, functionName, args = []) => {
  const raw = await client.readContract({ address, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
  return JSON.parse(raw);
};

const contracts = {
  publisherLedger: "publisher_ledger.py",
  covenantBook: "covenant_book.py",
  adjudicator: "adjudicator.py",
  mandateRouter: "mandate_router.py",
  serviceControl: "service_control.py",
};

for (const [key, file] of Object.entries(contracts)) {
  const txHash = manifest.deploymentTransactions[key];
  const tx = await client.getTransaction({ hash: txHash });
  const local = await readFile(new URL(`../contracts/${file}`, import.meta.url));
  const deployed = Buffer.from(tx.data?.contract_code || "", "base64");
  assert(`${key} deployment finalized`, tx.statusName === "FINALIZED", `${txHash} status=${tx.statusName}`);
  assert(`${key} address`, tx.to_address?.toLowerCase() === manifest.contracts[key].toLowerCase(), `${tx.to_address} == ${manifest.contracts[key]}`);
  assert(`${key} source bytes`, deployed.equals(local), `sha256=${sha256(deployed)} file=${file}`);
}

const transactionGroups = [
  manifest.deploymentTransactions,
  { bindAdjudicator: manifest.bindAdjudicatorTransaction },
  manifest.adapterRegistrationTransactions,
  manifest.productionBootstrapTransactions,
  manifest.verifiedProductionFlow,
];
for (const [name, hash] of transactionGroups.flatMap(group => Object.entries(group))) {
  const tx = await client.getTransaction({ hash });
  assert(`transaction ${name}`, tx.statusName === "FINALIZED", `${hash} status=${tx.statusName} result=${tx.result_name}`);
}

const provider = await readJson(manifest.contracts.publisherLedger, "get_snapshot_json", ["provider-production-1791733886"]);
const corroborator = await readJson(manifest.contracts.publisherLedger, "get_snapshot_json", ["monitor-production-1791733886"]);
for (const [name, snapshot] of [["provider", provider], ["corroborator", corroborator]]) {
  const response = await fetch(snapshot.url, { cache: "no-store" });
  const body = Buffer.from(await response.arrayBuffer());
  assert(`${name} HTTP status`, response.status === 200, `${snapshot.url} status=${response.status}`);
  assert(`${name} exact bytes`, sha256(body) === snapshot.content_digest, `${sha256(body)} == ${snapshot.content_digest}`);
}

const policy = manifest.activeProductionPolicy;
const activeKey = await client.readContract({ address: manifest.contracts.covenantBook, functionName: "get_active_covenant_key", args: [policy.serviceKey], transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
const covenant = await readJson(manifest.contracts.covenantBook, "get_covenant_json", [activeKey]);
assert("active covenant key", activeKey === policy.covenantKey, `${activeKey} == ${policy.covenantKey}`);
assert("active covenant digest", covenant.covenant_digest === policy.covenantDigest, `${covenant.covenant_digest} == ${policy.covenantDigest}`);

const verified = manifest.verifiedCase;
const caseRecord = await readJson(manifest.contracts.adjudicator, "get_case_json", [verified.caseKey]);
assert("case adjudicated", caseRecord.status === "ADJUDICATED", `status=${caseRecord.status}`);
assert("verdict decision", caseRecord.decision === verified.decision, `decision=${caseRecord.decision}`);
assert("verdict digest", caseRecord.verdict_digest === verified.verdictDigest, `digest=${caseRecord.verdict_digest}`);

const mandate = await readJson(manifest.contracts.mandateRouter, "get_mandate_json", [verified.mandateKey]);
assert("mandate applied", mandate.status === "APPLIED", `status=${mandate.status}`);
assert("mandate action digest", mandate.action_digest === verified.actionDigest, `digest=${mandate.action_digest}`);
assert("mandate single dispatch", Number(mandate.dispatch_count) === 1, `dispatch_count=${mandate.dispatch_count}`);

const applied = await client.readContract({ address: manifest.contracts.serviceControl, functionName: "get_applied_mandate_digest", args: [verified.mandateKey], transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
const service = await readJson(manifest.contracts.serviceControl, "get_status_json");
assert("target receipt digest", applied === verified.actionDigest, `${applied} == ${verified.actionDigest}`);
assert("target application count", Number(service.applied_mandate_count) >= 1, `applied_mandate_count=${service.applied_mandate_count}`);

const provenanceResponse = await fetch(`${manifest.application}/api/provenance`, { cache: "no-store" });
const provenance = provenanceResponse.ok ? await provenanceResponse.json() : null;
assert("public provenance endpoint", provenance?.classification === "DEMONSTRATION_FIXTURE" && provenance?.measurement_independence === false, `status=${provenanceResponse.status}`);

const buildResponse = await fetch(`${manifest.application}/api/build`, { cache: "no-store" });
const build = buildResponse.ok ? await buildResponse.json() : null;
assert("public build identity", /^[0-9a-f]{40}$/.test(build?.git_commit || ""), `status=${buildResponse.status} git_commit=${build?.git_commit}`);

const report = {
  schema: "veriduct-deployment-verification-v1",
  generated_at: new Date().toISOString(),
  verifier_commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  deployed_frontend_commit: build.git_commit,
  network: { chain_id: manifest.chainId, rpc: manifest.rpc },
  evidence_classification: provenance.classification,
  checks,
  authoritative_readback: { provider, corroborator, covenant, case: caseRecord, mandate, service, applied_mandate_digest: applied },
};

if (writeReport) await writeFile(new URL("../verification-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: checks.length, report_written: writeReport, deployed_frontend_commit: build.git_commit }, null, 2));
