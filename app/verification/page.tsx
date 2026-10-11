import { VerificationPanel } from "@/components/VerificationPanel";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export default function Verification() {
  return <div className="page workspace">
    <WorkspaceHeader kicker="REPRODUCIBILITY PLANE" title="Live deployment proof" copy="Re-run exact-byte checks and authoritative latest-final contract reads from the browser. Every stage below is derived from the public Studionet deployment, not local workflow state."/>
    <div className="scopeNotice"><div><small>INTERPRETATION</small><b>Authentication ≠ accuracy</b></div><p>A green evidence check means the fetched bytes equal the publisher commitment. It does not establish that a synthetic fixture was measured by an independent monitoring system.</p><a href="/api/provenance" target="_blank">Read provenance JSON</a></div>
    <VerificationPanel/>
  </div>;
}
