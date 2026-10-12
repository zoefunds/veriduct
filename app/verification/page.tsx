import { VerificationPanel } from "@/components/VerificationPanel";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import manifest from "@/deployment-manifest.public.json";
import { explorerTx } from "@/lib/config";

const workflow = [
  ["USGS evidence anchor", manifest.bootstrapTransactions.usgsSnapshot],
  ["EMSC evidence anchor", manifest.bootstrapTransactions.emscSnapshot],
  ["Covenant publication", manifest.bootstrapTransactions.covenantPublish],
  ["Covenant activation", manifest.bootstrapTransactions.covenantActivation],
  ["Independent case creation", manifest.verifiedFlow.caseOpen],
  ["Validator adjudication", manifest.verifiedFlow.adjudication],
  ["Finality-gated issuance", manifest.verifiedFlow.mandateIssue],
  ["Permissionless execution", manifest.verifiedFlow.mandateExecution],
  ["Finality-gated target application", manifest.verifiedFlow.targetApplication],
  ["Receipt reconciliation", manifest.verifiedFlow.mandateReconciliation],
] as const;
const negative = [
  ["Early activation rejected", manifest.bootstrapTransactions.earlyActivationRejection],
  ["Duplicate dispatch rejected", manifest.negativeTests.duplicateDispatch],
  ["Direct adapter call rejected", manifest.negativeTests.directAdapterCall],
  ["Malformed payload rejected", manifest.negativeTests.malformedPayload],
  ["Manipulated evidence denied", manifest.negativeTests.manipulatedAdjudication],
  ["Expired execution rejected", manifest.negativeTests.expiredMandateExecution],
] as const;

export default function Verification() {
  return <div className="page workspace">
    <WorkspaceHeader kicker="REPRODUCIBILITY PLANE" title="Live deployment proof" copy="Re-run exact-byte checks and authoritative latest-final contract reads from the browser. Every stage below is derived from the public Studionet deployment, not local workflow state."/>
    <div className="scopeNotice"><div><small>INTERPRETATION</small><b>Authentication ≠ accuracy</b></div><p>A green evidence check means the fetched bytes equal the frozen USGS or EMSC commitment. Separate authority systems provide independent provenance and corroboration, but each authority remains responsible for its scientific measurement accuracy.</p><a href="/api/provenance" target="_blank">Read provenance JSON</a></div>
    <VerificationPanel/>
    <div className="split">
      <section className="panel"><div className="panelHead"><div><small>COMPLETE FRONTEND TRACE</small><h2>Source to receipt</h2></div></div><div className="recordList">{workflow.map(([label, hash]) => <a className="recordButton" href={explorerTx(hash)} target="_blank" key={label}><b>{label}</b><code>{hash}</code></a>)}</div></section>
      <section className="panel"><div className="panelHead"><div><small>FINALIZED NEGATIVE TESTS</small><h2>Fail-closed evidence</h2></div></div><div className="recordList">{negative.map(([label, hash]) => <a className="recordButton" href={explorerTx(hash)} target="_blank" key={label}><b>{label}</b><code>{hash}</code></a>)}</div></section>
    </div>
  </div>;
}
