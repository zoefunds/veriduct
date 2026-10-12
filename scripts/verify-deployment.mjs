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
const read = (address, functionName, args = []) => client.readContract({ address, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
const readJson = async (address, functionName, args = []) => JSON.parse(await read(address, functionName, args));
const outcome = tx => tx.consensus_data?.leader_receipt?.[0]?.execution_result;
const tx = hash => client.getTransaction({ hash });

const contractFiles = { publisherLedger: "publisher_ledger.py", covenantBook: "covenant_book.py", adjudicator: "adjudicator.py", mandateRouter: "mandate_router.py", serviceControl: "service_control.py" };
for (const [key, file] of Object.entries(contractFiles)) {
  const receipt = await tx(manifest.deploymentTransactions[key]);
  const local = await readFile(new URL(`../contracts/${file}`, import.meta.url));
  const deployed = Buffer.from(receipt.data?.contract_code || "", "base64");
  assert(`${key} finalized`, receipt.statusName === "FINALIZED", `status=${receipt.statusName}`);
  assert(`${key} GenVM success`, outcome(receipt) === "SUCCESS", `execution=${outcome(receipt)}`);
  assert(`${key} deployed address`, receipt.to_address?.toLowerCase() === manifest.contracts[key].toLowerCase(), receipt.to_address);
  assert(`${key} exact source`, deployed.equals(local) && sha256(local) === manifest.deployedSourceSha256[key], `sha256=${sha256(deployed)}`);
}

const successes = { ...manifest.authorityRegistrationTransactions, bindAdjudicator: manifest.bindAdjudicatorTransaction, ...manifest.adapterRegistrationTransactions, usgsSnapshot: manifest.bootstrapTransactions.usgsSnapshot, emscSnapshot: manifest.bootstrapTransactions.emscSnapshot, covenantPublish: manifest.bootstrapTransactions.covenantPublish, covenantActivation: manifest.bootstrapTransactions.covenantActivation, caseOpen: manifest.verifiedFlow.caseOpen, adjudication: manifest.verifiedFlow.adjudication, mandateIssue: manifest.verifiedFlow.mandateIssue, mandateExecution: manifest.verifiedFlow.mandateExecution, targetApplication: manifest.verifiedFlow.targetApplication, mandateReconciliation: manifest.verifiedFlow.mandateReconciliation, manipulatedAnchor: manifest.negativeTests.manipulatedAnchor, manipulatedCaseOpen: manifest.negativeTests.manipulatedCaseOpen, manipulatedAdjudication: manifest.negativeTests.manipulatedAdjudication };
for (const [name, hash] of Object.entries(successes)) {
  const receipt = await tx(hash);
  assert(`${name} finalized`, receipt.statusName === "FINALIZED", `${hash} status=${receipt.statusName}`);
  assert(`${name} GenVM success`, outcome(receipt) === "SUCCESS", `${hash} execution=${outcome(receipt)}`);
}
const rejections = { earlyActivation: manifest.bootstrapTransactions.earlyActivationRejection, duplicateDispatch: manifest.negativeTests.duplicateDispatch, directAdapterCall: manifest.negativeTests.directAdapterCall, malformedPayload: manifest.negativeTests.malformedPayload, expiredMandateExecution: manifest.negativeTests.expiredMandateExecution };
for (const [name, hash] of Object.entries(rejections)) {
  assert(`${name} hash recorded`, /^0x[0-9a-f]{64}$/.test(hash), hash);
  const receipt = await tx(hash);
  assert(`${name} finalized`, receipt.statusName === "FINALIZED", `${hash} status=${receipt.statusName}`);
  assert(`${name} rejected`, outcome(receipt) === "ERROR", `${hash} execution=${outcome(receipt)}`);
}

const authority = {};
for (const [key, snapshotInfo] of Object.entries(manifest.authoritySnapshots)) {
  const snapshot = await readJson(manifest.contracts.publisherLedger, "get_snapshot_json", [snapshotInfo.snapshotKey]);
  const response = await fetch(snapshot.url, { cache: "no-store" });
  const body = Buffer.from(await response.arrayBuffer());
  assert(`${key} authority HTTP`, response.ok, `${snapshot.url} status=${response.status}`);
  assert(`${key} exact bytes`, sha256(body) === snapshot.content_digest, `${sha256(body)} == ${snapshot.content_digest}`);
  authority[key] = snapshot;
}
assert("independent authority hosts", authority.usgs.origin_host !== authority.emsc.origin_host, `${authority.usgs.origin_host} != ${authority.emsc.origin_host}`);
assert("independent authority classes", authority.usgs.source_class !== authority.emsc.source_class, `${authority.usgs.source_class} != ${authority.emsc.source_class}`);

const activeKey = await read(manifest.contracts.covenantBook, "get_active_covenant_key", [manifest.activePolicy.serviceKey]);
const covenant = await readJson(manifest.contracts.covenantBook, "get_covenant_json", [activeKey]);
assert("active covenant", activeKey === manifest.activePolicy.covenantKey && covenant.covenant_digest === manifest.activePolicy.covenantDigest, `${activeKey} ${covenant.covenant_digest}`);
assert("permissionless claims", covenant.claim_mode === "PERMISSIONLESS", covenant.claim_mode);

const verified = manifest.verifiedCase;
const caseRecord = await readJson(manifest.contracts.adjudicator, "get_case_json", [verified.caseKey]);
const verdict = JSON.parse(caseRecord.verdict_json);
assert("independent claimant", caseRecord.requester.toLowerCase() === manifest.independentClaimant.toLowerCase() && caseRecord.requester.toLowerCase() !== caseRecord.service_owner.toLowerCase(), caseRecord.requester);
assert("breach verdict", verdict.decision === verified.decision && caseRecord.verdict_digest === verified.verdictDigest, `${verdict.decision} ${caseRecord.verdict_digest}`);
assert("two supporting authorities", verdict.snapshot_states.length === 2 && verdict.snapshot_states.every(item => item.state === "SUPPORTS_BREACH"), JSON.stringify(verdict.snapshot_states));

const mandate = await readJson(manifest.contracts.mandateRouter, "get_mandate_json", [verified.mandateKey]);
const applied = await read(manifest.contracts.serviceControl, "get_applied_mandate_digest", [verified.mandateKey]);
const service = await readJson(manifest.contracts.serviceControl, "get_status_json");
assert("mandate applied once", mandate.status === "APPLIED" && Number(mandate.dispatch_count) === 1, `${mandate.status} dispatch_count=${mandate.dispatch_count}`);
assert("target receipt", mandate.action_digest === verified.actionDigest && applied === verified.actionDigest, `${mandate.action_digest} ${applied}`);

const manipulated = await readJson(manifest.contracts.adjudicator, "get_case_json", ["manipulated-evidence-case-v1"]);
const manipulatedVerdict = JSON.parse(manipulated.verdict_json);
assert("manipulated evidence denied", manipulated.status === "CLOSED_NO_MANDATE" && manipulatedVerdict.decision !== "BREACH_PROVEN" && manipulated.mandate_key === "", `${manipulated.status} ${manipulatedVerdict.decision}`);

const provenanceResponse = await fetch(`${manifest.application}/api/provenance`, { cache: "no-store" });
const provenance = provenanceResponse.ok ? await provenanceResponse.json() : null;
assert("public provenance", provenance?.classification === "INDEPENDENT_AUTHORITATIVE_RECORDS" && provenance?.measurement_independence === true, `status=${provenanceResponse.status}`);
const buildResponse = await fetch(`${manifest.application}/api/build`, { cache: "no-store" });
const build = buildResponse.ok ? await buildResponse.json() : null;
assert("public build identity", /^[0-9a-f]{40}$/.test(build?.git_commit || ""), `status=${buildResponse.status} commit=${build?.git_commit}`);
const browserReadResponse = await fetch(`${manifest.application}/api/genlayer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "read", address: manifest.contracts.covenantBook, functionName: "get_active_covenant_key", args: [manifest.activePolicy.serviceKey] }) });
const browserRead = browserReadResponse.ok ? await browserReadResponse.json() : null;
assert("frontend same-origin finalized read", browserRead?.result === manifest.activePolicy.covenantKey, `status=${browserReadResponse.status} result=${browserRead?.result}`);

const report = { schema: "veriduct-deployment-verification-v2", generated_at: new Date().toISOString(), verifier_commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), deployed_frontend_commit: build.git_commit, network: { chain_id: manifest.chainId, rpc: manifest.rpc }, checks, authoritative_readback: { authority, covenant, case: caseRecord, verdict, mandate, service, applied_mandate_digest: applied, manipulated_case: manipulated, manipulated_verdict: manipulatedVerdict } };
if (writeReport) await writeFile(new URL("../verification-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: checks.length, report_written: writeReport, deployed_frontend_commit: build.git_commit }, null, 2));
